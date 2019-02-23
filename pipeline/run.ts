import * as fs from "fs"
import * as util from "util"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"
import purposes from "./purposes"
import html from "./html"
import codeGeneration from "./code-generation"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const fsUnlink = util.promisify(fs.unlink)

const importedByPurpose = new utilities.KeyedCache<types.Purpose, Promise<types.ImportedPurposeFile<any>>>(
  async purpose => JSON.parse(await fsReadFile(paths.importedPurposeCache(purpose), { encoding: `utf8` }))
)

function filterUnsupportedContent(
  content: null | types.ContentReference<string, string>,
  reportUnsupported: boolean
): boolean {
  if (content) {
    if (Object.prototype.hasOwnProperty.call(purposes, content.purpose)) {
      const purpose = content.purpose as types.Purpose
      const extensions: ReadonlyArray<string> = types.PurposeExtensionValue[purpose]
      if (extensions.includes(content.extension)) {
        return true
      } else {
        if (reportUnsupported) {
          utilities.reportNonFatalError(`Unsupported import extension "${content.extension}" for purpose "${content.purpose}" in content path "${content.source}".`)
        }
      }
    } else {
      if (reportUnsupported) {
        utilities.reportNonFatalError(`Unsupported purpose "${content.purpose}" in content path "${content.source}".`)
      }
    }
  }
  return false
}

export default async function (
  contentModifiedDates: { readonly [filename: string]: number }
): Promise<void> {
  console.log(`Start of run.`)
  console.log(`Reading state file...`)
  const state: types.State = JSON.parse(await fsReadFile(paths.stateFile(), { encoding: `utf8` }))
  console.log(`Deleting state file to mark build incomplete...`)
  await fsUnlink(paths.stateFile())

  console.log(`Comparing old and new file trees...`)
  const addedFiles = Object
    .keys(contentModifiedDates)
    .filter(file => !Object.prototype.hasOwnProperty.call(state.contentModifiedDates, file))
  const updatedFiles = Object
    .keys(contentModifiedDates)
    .filter(file => Object.prototype.hasOwnProperty.call(state.contentModifiedDates, file))
    .filter(file => contentModifiedDates[file] !== state.contentModifiedDates[file])
  const deletedFiles = Object
    .keys(state.contentModifiedDates)
    .filter(file => !Object.prototype.hasOwnProperty.call(contentModifiedDates, file))
  const unmodifiedFiles = Object
    .keys(contentModifiedDates)
    .filter(file => Object.prototype.hasOwnProperty.call(state.contentModifiedDates, file))
    .filter(file => contentModifiedDates[file] === state.contentModifiedDates[file])

  await html(addedFiles, updatedFiles, deletedFiles, unmodifiedFiles)

  const addedContent = addedFiles
    .map(paths.analyze)
    .filter((content): content is types.ContentReference<types.Purpose, string> => filterUnsupportedContent(content, true))
  const updatedContent = updatedFiles
    .map(paths.analyze)
    .filter((content): content is types.ContentReference<types.Purpose, string> => filterUnsupportedContent(content, true))
  const deletedContent = deletedFiles
    .map(paths.analyze)
    .filter((content): content is types.ContentReference<types.Purpose, string> => filterUnsupportedContent(content, false))

  const purposesToPack: types.Purpose[] = []
  if (state.firstRun) {
    for (const purpose in purposes) {
      purposesToPack.push(purpose as types.Purpose)
    }
  } else {
    addedContent
      .concat(updatedContent)
      .concat(deletedContent)
      .forEach(content => {
        if (!purposesToPack.includes(content.purpose)) {
          purposesToPack.push(content.purpose)
        }
      })
  }

  await utilities.asyncProgressBar(`Reading cached imported content...`, purposesToPack, true, async purpose => await importedByPurpose.get(purpose))

  await utilities.asyncProgressBar(`Deleting content...`, updatedContent.concat(deletedContent), true, async content => {
    const implementation = purposes[content.purpose].delete as any
    const metadata = await importedByPurpose.get(content.purpose)
    const source = content.source
    await implementation(metadata.common, content as any, metadata.byFile[source])
    delete metadata.byFile[source]
  })
  await utilities.asyncProgressBar(`Importing content...`, updatedContent.concat(addedContent), true, async content => {
    const implementation = purposes[content.purpose].import as any
    const metadata = await importedByPurpose.get(content.purpose)
    const source = content.source
    metadata.byFile[source] = await implementation(metadata.common, content as any)
  })

  await utilities.asyncProgressBar(`Writing cached imported content...`, purposesToPack, true, async purpose => await fsWriteFile(paths.importedPurposeCache(purpose), JSON.stringify(await importedByPurpose.get(purpose))))

  await utilities.asyncProgressBar(`Packing content...`, purposesToPack, false, async purpose => {
    const implementation = purposes[purpose].pack as any
    const metadata = await importedByPurpose.get(purpose)
    const allMetadata: any[] = []
    for (const key in metadata.byFile) {
      metadata.byFile[key].forEach(item => allMetadata.push(item))
    }
    state.packedContentMetadata[purpose] = await implementation(allMetadata)
  })

  // This is always done as the generated file isn't in different places if localization or environment are changed.
  console.log(`Generating content code...`)
  await codeGeneration(state)

  console.log(`Writing state file...`)
  state.firstRun = false
  state.contentModifiedDates = contentModifiedDates
  await fsWriteFile(paths.stateFile(), JSON.stringify(state))
  console.log(`End of run.`)
}
