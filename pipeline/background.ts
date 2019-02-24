import * as fs from "fs"
import * as util from "util"
import * as childProcess from "child_process"
import * as _rimraf from "rimraf"
import * as pngjs from "pngjs"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"
import * as png from "./png"
import * as aseprite from "./aseprite"

const fsUnlink = util.promisify(fs.unlink)
const fsReadFile = util.promisify(fs.readFile)
const rimraf = util.promisify(_rimraf)

const exported: types.PurposeImplementation["background"] = {
  async delete(
    common: types.ImportedCommonPurpose["background"],
    content: types.ContentReference<"background", types.PurposeExtensionType["background"]>,
    imported: ReadonlyArray<types.ImportedPurpose["background"]>
  ): Promise<void> {
    for (const item of imported) {
      common.ids.splice(common.ids.indexOf(item.id), 1)
      await fsUnlink(paths.artifactsFile(`background-${item.id}.png`))
    }
    await rimraf(paths.importedDirectory(content))
  },

  async import(
    common: types.ImportedCommonPurpose["background"],
    content: types.ContentReference<"background", types.PurposeExtensionType["background"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["background"]>> {
    switch (content.extension) {
      case `png`:
        const pngContent = await png.read(content.source)
        const trimBounds = png.trim(pngContent)
        if (trimBounds) {
          const id = utilities.findNextId(common.ids)
          await png.write(trimBounds.png, paths.artifactsFile(`background-${id}.png`), true)
          return [{
            segments: utilities.preprocessSegments(content.segments, []),
            id: id,
            width: trimBounds.width,
            height: trimBounds.height,
            offsetX: trimBounds.left,
            offsetY: trimBounds.top
          }]
        } else {
          return []
        }
      case `ase`:
      case `aseprite`:
        const resolvedAsepritePath = await aseprite.executableConfiguration.get()
        const dataPath = paths.importedFile(content, `data.json`)
        await new Promise<string>((resolve, reject) => childProcess
          .spawn(
            resolvedAsepritePath.path,
            resolvedAsepritePath.prefixedArguments.concat([
              `--batch`, content.source,
              `--save-as`, paths.importedFile(content, `{frame}.png`),
              `--data`, dataPath,
              `--list-tags`,
              `--format`, `json-array`,
              `--ignore-empty`
            ]
            ))
          .on(`exit`, status => {
            if (status === 0) {
              resolve()
            } else {
              reject(new Error(`Unexpected Aseprite compiler exit (${status}).`))
            }
          })
        )
        const dataJson = await fsReadFile(dataPath, { encoding: `utf8` })
        const data: {
          readonly meta: {
            readonly frameTags: ReadonlyArray<{
              readonly name: string
              readonly from: number
              readonly to: number
              readonly direction: `forward` | `reverse` | `pingpong`
            }>
          }
        } = JSON.parse(dataJson)
        if (data.meta.frameTags.length) {
          const exported: {
            readonly id: number
            readonly png: pngjs.PNG
          }[] = []
          const output: types.ImportedPurpose["background"][] = []
          for (const frameTag of data.meta.frameTags) {
            const frameIds = aseprite.getFrameIds(frameTag)
            let i = 0
            for (const frameId of frameIds) {
              const pngContent = await png.read(paths.importedFile(content, `${frameId}.png`))
              const trimmed = png.trim(pngContent)
              if (trimmed) {
                let needsAdding = true
                for (const existing of exported) {
                  if (existing.png.width !== trimmed.width) {
                    continue
                  }

                  if (existing.png.height !== trimmed.height) {
                    continue
                  }

                  let y = 0
                  for (; y < trimmed.height; y++) {
                    let x = 0
                    for (; x < trimmed.width; x++) {
                      const existingIsTransparent = existing.png.data[(x + y * trimmed.width) * 4 + 3] === 0
                      const trimmedIsTransparent = trimmed.png.data[(x + y * trimmed.width) * 4 + 3] === 0
                      if (existingIsTransparent !== trimmedIsTransparent) {
                        break
                      }
                      if (!existingIsTransparent) {
                        let channel = 0
                        for (; channel < 3; channel++) {
                          const existingSample = existing.png.data[(x + y * trimmed.width) * 4 + channel]
                          const trimmedSample = trimmed.png.data[(x + y * trimmed.width) * 4 + channel]
                          if (existingSample !== trimmedSample) {
                            break
                          }
                        }
                        if (channel < 3) {
                          break
                        }
                      }
                    }
                    if (x < trimmed.width) {
                      break
                    }
                  }

                  if (y === trimmed.height) {
                    output.push({
                      segments: utilities.preprocessSegments(
                        content.segments,
                        frameIds.length === 1
                          ? [frameTag.name]
                          : [frameTag.name, `${i}`]
                      ),
                      id: existing.id,
                      width: trimmed.width,
                      height: trimmed.height,
                      offsetX: trimmed.left - pngContent.width / 2,
                      offsetY: trimmed.top - pngContent.height / 2
                    })
                    needsAdding = false
                    break
                  }
                }
                if (needsAdding) {
                  const id = utilities.findNextId(common.ids)
                  await png.write(trimmed.png, paths.artifactsFile(`background-${id}.png`), true)
                  exported.push({
                    id,
                    png: trimmed.png
                  })
                  output.push({
                    segments: utilities.preprocessSegments(
                      content.segments,
                      frameIds.length === 1
                        ? [frameTag.name]
                        : [frameTag.name, `${i}`]
                    ),
                    id,
                    width: trimmed.width,
                    height: trimmed.height,
                    offsetX: trimmed.left - pngContent.width / 2,
                    offsetY: trimmed.top - pngContent.height / 2
                  })
                }
                i++
              }
            }
          }
          return output
        } else {
          const pngContent = await png.read(paths.importedFile(content, `0.png`))
          const trimmed = png.trim(pngContent)
          if (trimmed) {
            const id = utilities.findNextId(common.ids)
            await png.write(trimmed.png, paths.artifactsFile(`background-${id}.png`), true)
            return [{
              segments: utilities.preprocessSegments(content.segments, []),
              id: id,
              width: trimmed.width,
              height: trimmed.height,
              offsetX: trimmed.left - pngContent.width / 2,
              offsetY: trimmed.top - pngContent.height / 2
            }]
          } else {
            return []
          }
        }
    }
  },

  async pack(
    imported: ReadonlyArray<types.ImportedPurpose["background"]>
  ): Promise<ReadonlyArray<types.Packed>> {
    return imported.map(background => ({
      segments: background.segments,
      code: `engineBackground(${background.id})`
    }))
  }
}

export default exported
