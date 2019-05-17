import * as fs from "fs"
import * as util from "util"
import * as _mkdirp from "mkdirp"
import * as _rimraf from "rimraf"
import * as pngjs from "pngjs"
import shellExecute from "./shell-execute"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"
import * as png from "./png"
import * as aseprite from "./aseprite"
import * as cacheBusting from "./cache-busting"

const fsReadFile = util.promisify(fs.readFile)
const mkdirp = util.promisify(_mkdirp)
const rimraf = util.promisify(_rimraf)

const exported: types.PurposeImplementation["background"] = {
  async delete(
    state: types.State,
    content: types.ContentReference<"background", types.PurposeExtensionType["background"]>,
    imported: ReadonlyArray<types.ImportedPurpose["background"]>
  ): Promise<void> {
    for (const item of imported) {
      await cacheBusting.release(state, `${item.filename}.png`)
    }
    await rimraf(paths.importedDirectory(content))
  },

  async import(
    state: types.State,
    content: types.ContentReference<"background", types.PurposeExtensionType["background"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["background"]>> {
    switch (content.extension) {
      case `png`:
        const pngContent = await png.read(content.source)
        const trimBounds = png.trim(pngContent)
        if (trimBounds) {
          return [{
            segments: utilities.preprocessSegments(content.segments, []),
            filename: await png.writeWithCacheBusting(state, trimBounds.png),
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
        const resolvedAsepritePath = await aseprite.executablePath.get()
        await mkdirp(paths.importedDirectory(content))
        const dataPath = paths.importedFile(content, `data.json`)
        await shellExecute(
          `Invoke Aseprite to convert "${content.source}".`,
          resolvedAsepritePath,
          [
            `--batch`, content.source,
            `--save-as`, paths.importedFile(content, `0.png`),
            `--data`, dataPath,
            `--list-tags`,
            `--format`, `json-array`,
            `--ignore-empty`
          ]
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
            readonly filename: string
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
                      filename: existing.filename,
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
                  const filename = await png.writeWithCacheBusting(state, trimmed.png)
                  exported.push({
                    filename,
                    png: trimmed.png
                  })
                  output.push({
                    segments: utilities.preprocessSegments(
                      content.segments,
                      frameIds.length === 1
                        ? [frameTag.name]
                        : [frameTag.name, `${i}`]
                    ),
                    filename,
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
            const filename = await png.writeWithCacheBusting(state, trimmed.png)
            return [{
              segments: utilities.preprocessSegments(content.segments, []),
              filename,
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
    state: types.State,
    imported: ReadonlyArray<types.ImportedPurpose["background"]>
  ): Promise<types.Packed<"background">> {
    return {
      code: ``,
      items: imported.map(background => ({
        segments: background.segments,
        code: {
          type: `Background`,
          value: `new Background(${JSON.stringify(background.filename)}, ${background.width}, ${background.height}, ${background.offsetX}, ${background.offsetY})`
        }
      })),
      packed: {}
    }
  },

  async deletePacked(
    state: types.State,
    packed: types.Packed<"background">
  ): Promise<void> {

  }
}

export default exported
