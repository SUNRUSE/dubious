import * as fs from "fs"
import * as util from "util"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"
import purposes from "./purposes"
import * as html from "./html"
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
  contentVersions: { readonly [filename: string]: string }
): Promise<void> {
  console.log(`Start of run.`)
  console.log(`Reading state file...`)
  const state: types.State = JSON.parse(await fsReadFile(paths.stateFile(), { encoding: `utf8` }))
  console.log(`Deleting state file to mark build incomplete...`)
  await fsUnlink(paths.stateFile())

  console.log(`Comparing old and new file trees...`)
  const addedFiles = Object
    .keys(contentVersions)
    .filter(file => !Object.prototype.hasOwnProperty.call(state.contentVersions, file))
  const updatedFiles = Object
    .keys(contentVersions)
    .filter(file => Object.prototype.hasOwnProperty.call(state.contentVersions, file))
    .filter(file => contentVersions[file] !== state.contentVersions[file])
  const deletedFiles = Object
    .keys(state.contentVersions)
    .filter(file => !Object.prototype.hasOwnProperty.call(contentVersions, file))
  const unmodifiedFiles = Object
    .keys(contentVersions)
    .filter(file => Object.prototype.hasOwnProperty.call(state.contentVersions, file))
    .filter(file => contentVersions[file] === state.contentVersions[file])

  await html.generateFavicons(state, addedFiles, updatedFiles, deletedFiles, unmodifiedFiles)

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
    await implementation(state, content as any, metadata[source])
    delete metadata[source]
  })
  await utilities.asyncProgressBar(`Importing content...`, updatedContent.concat(addedContent), true, async content => {
    const implementation = purposes[content.purpose].import as any
    const metadata = await importedByPurpose.get(content.purpose)
    const source = content.source
    metadata[source] = await implementation(state, content as any)
  })

  await utilities.asyncProgressBar(`Writing cached imported content...`, purposesToPack, true, async purpose => await fsWriteFile(paths.importedPurposeCache(purpose), JSON.stringify(await importedByPurpose.get(purpose))))

  if (!state.firstRun) {
    await utilities.asyncProgressBar(`Deleting previously packed content...`, purposesToPack, false, async purpose => {
      const implementation = purposes[purpose].deletePacked as any
      await implementation(state, state.packedContentMetadata[purpose])
    })
  }

  await utilities.asyncProgressBar(`Packing content...`, purposesToPack, false, async purpose => {
    const implementation = purposes[purpose].pack as any
    const metadata = await importedByPurpose.get(purpose)
    const allMetadata: any[] = []
    for (const key in metadata) {
      metadata[key].forEach(item => allMetadata.push(item))
    }
    state.packedContentMetadata[purpose] = await implementation(state, allMetadata)
  })

  // This is always done as the generated file isn't in different places if localization or environment are changed.
  console.log(`Generating content code...`)
  await codeGeneration(state)

  console.log(`Generating HTML...`)
  await html.generateHtml()

  console.log(`Writing state file...`)
  state.firstRun = false
  state.contentVersions = contentVersions
  await fsWriteFile(paths.stateFile(), JSON.stringify(state))
  console.log(`End of run.`)
}
