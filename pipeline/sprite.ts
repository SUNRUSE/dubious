import * as util from "util"
import * as childProcess from "child_process"
import * as _mkdirp from "mkdirp"
import * as _rimraf from "rimraf"
import * as pngjs from "pngjs"
import * as types from "./types"
import * as paths from "./paths"
import settings from "./settings"
import * as utilities from "./utilities"
import * as png from "./png"
import * as aseprite from "./aseprite"

const mkdirp = util.promisify(_mkdirp)
const rimraf = util.promisify(_rimraf)

const exported: types.PurposeImplementation["sprite"] = {
  async delete(
    common: types.ImportedCommonPurpose["sprite"],
    content: types.ContentReference<"sprite", types.PurposeExtensionType["sprite"]>,
    imported: ReadonlyArray<types.ImportedPurpose["sprite"]>
  ): Promise<void> {
    for (const item of imported) {
      png.cache.revoke(item.pngPath)
    }
    await rimraf(paths.importedDirectory(content))
  },

  async import(
    common: types.ImportedCommonPurpose["sprite"],
    content: types.ContentReference<"sprite", types.PurposeExtensionType["sprite"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["sprite"]>> {
    switch (content.extension) {
      case `png`:
        const pngContent = await png.cache.get(content.source)
        const trimmed = png.findTrimBounds(pngContent)
        if (trimmed) {
          return [{
            segments: utilities.preprocessSegments(content.segments, []),
            pngPath: content.source,
            sheetX: trimmed.left,
            sheetY: trimmed.top,
            width: trimmed.width,
            height: trimmed.height,
            offsetX: trimmed.left - pngContent.width / 2,
            offsetY: trimmed.top - pngContent.height / 2
          }]
        } else {
          return []
        }
      case `ase`:
      case `aseprite`:
        const sheetPath = paths.importedFile(content, `sheet.png`)
        const resolvedAsepritePath = await aseprite.executablePath.get()
        await mkdirp(paths.importedDirectory(content))
        const dataJson = await new Promise<string>((resolve, reject) => {
          let output = ``
          const process = childProcess.spawn(
            resolvedAsepritePath,
            [
              `--batch`, content.source,
              `--list-tags`,
              `--format`, `json-array`,
              `--sheet`, sheetPath,
              `--sheet-pack`,
              `--trim`,
              `--ignore-empty`
            ]
          )

          let stdOutClosed = false
          let succeeded: null | boolean = null

          process.stdout.on(`data`, data => output += data)
          process.stdout.on(`close`, () => {
            stdOutClosed = true
            checkSuccess()
          })

          process.on(`exit`, status => {
            succeeded = status === 0
            checkSuccess()
          })

          function checkSuccess(): void {
            if (!stdOutClosed) {
              return
            }
            switch (succeeded) {
              case null:
                break
              case false:
                reject(new Error(`Failed to invoke Aseprite to convert "${content.source}"; "${output}".`))
                break
              case true:
                resolve(output)
                break
            }
          }
        })
        const data: {
          readonly frames: ReadonlyArray<{
            readonly frame: {
              readonly x: number
              readonly y: number
              readonly w: number
              readonly h: number
            }
            readonly spriteSourceSize: {
              readonly x: number
              readonly y: number
            }
            readonly sourceSize: {
              readonly w: number
              readonly h: number
            }
          }>
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
          const allFrames: types.ImportedPurpose["sprite"][] = []
          for (const frameTag of data.meta.frameTags) {
            const frameIds = aseprite.getFrameIds(frameTag)
            frameIds
              .map(frameId => data.frames[frameId])
              .forEach((frame, i) => allFrames.push({
                segments: utilities.preprocessSegments(
                  content.segments,
                  frameIds.length === 1
                    ? [frameTag.name]
                    : [frameTag.name, `${i}`]
                ),
                pngPath: sheetPath,
                sheetX: frame.frame.x,
                sheetY: frame.frame.y,
                width: frame.frame.w,
                height: frame.frame.h,
                offsetX: frame.spriteSourceSize.x - frame.sourceSize.w / 2,
                offsetY: frame.spriteSourceSize.y - frame.sourceSize.h / 2
              }))
          }
          return allFrames
        } else {
          await new Promise<string>((resolve, reject) => childProcess
            .spawn(
              resolvedAsepritePath,
              [
                `--batch`, content.source,
                `--save-as`, sheetPath
              ]
            )
            .on(`exit`, status => {
              if (status === 0) {
                resolve()
              } else {
                reject(new Error(`Failed to invoke Aseprite to convert "${content.source}".`))
              }
            })
          )
          const pngContent = await png.cache.get(sheetPath)
          const trimmed = png.findTrimBounds(pngContent)
          if (trimmed) {
            return [{
              segments: utilities.preprocessSegments(content.segments, []),
              pngPath: sheetPath,
              sheetX: trimmed.left,
              sheetY: trimmed.top,
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
    imported: ReadonlyArray<types.ImportedPurpose["sprite"]>
  ): Promise<types.Packed<"sprite">> {
    if (!imported.length) {
      await png.write(
        new pngjs.PNG({ width: 1, height: 1 }),
        paths.artifactsFile(`atlas.png`)
      )
      return {
        code: `
const atlasWidth = 1
const atlasHeight = 1
`,
        items: [],
        packed: {}
      }
    }

    type LoadedFrame = {
      readonly spriteFrame: types.ImportedPurpose["sprite"]
      readonly png: pngjs.PNG
    }

    const loadedFrames: LoadedFrame[] = await utilities.asyncProgressBar(`Reading sheets...`, imported, true, async spriteFrame => {
      return {
        spriteFrame,
        png: await png.cache.get(spriteFrame.pngPath)
      }
    })

    type UnpackedFrame = {
      readonly spriteFrame: types.ImportedPurpose["sprite"]
      readonly png: pngjs.PNG
      readonly users: ReadonlyArray<string>[]
      readonly requiredWidth: number
      readonly requiredHeight: number
    }

    const unpackedFrames: UnpackedFrame[] = []

    if (settings.development) {
      for (const loadedFrame of loadedFrames) {
        unpackedFrames.push({
          spriteFrame: loadedFrame.spriteFrame,
          png: loadedFrame.png,
          users: [loadedFrame.spriteFrame.segments],
          requiredWidth: loadedFrame.spriteFrame.width + 1,
          requiredHeight: loadedFrame.spriteFrame.height + 1
        })
      }
    } else {
      for (const loadedFrame of loadedFrames) {
        let needsAdding = true
        for (const unpackedFrame of unpackedFrames) {
          if (unpackedFrame.spriteFrame.width !== loadedFrame.spriteFrame.width) {
            continue
          }

          if (unpackedFrame.spriteFrame.height !== loadedFrame.spriteFrame.height) {
            continue
          }

          let y = 0
          for (; y < loadedFrame.spriteFrame.height; y++) {
            let x = 0
            for (; x < loadedFrame.spriteFrame.width; x++) {
              const loadedIsTransparent = loadedFrame.png.data[(x + loadedFrame.spriteFrame.sheetX + (y + loadedFrame.spriteFrame.sheetY) * loadedFrame.png.width) * 4 + 3] === 0
              const unpackedIsTransparent = unpackedFrame.png.data[(x + unpackedFrame.spriteFrame.sheetX + (y + unpackedFrame.spriteFrame.sheetY) * unpackedFrame.png.width) * 4 + 3] === 0
              if (loadedIsTransparent !== unpackedIsTransparent) {
                break
              }
              if (!loadedIsTransparent) {
                let channel = 0
                for (; channel < 3; channel++) {
                  const loadedSample = loadedFrame.png.data[(x + loadedFrame.spriteFrame.sheetX + (y + loadedFrame.spriteFrame.sheetY) * loadedFrame.png.width) * 4 + channel]
                  const unpackedSample = unpackedFrame.png.data[(x + unpackedFrame.spriteFrame.sheetX + (y + unpackedFrame.spriteFrame.sheetY) * unpackedFrame.png.width) * 4 + channel]
                  if (loadedSample !== unpackedSample) {
                    break
                  }
                }
                if (channel < 3) {
                  break
                }
              }
            }
            if (x < loadedFrame.spriteFrame.width) {
              break
            }
          }
          if (y === loadedFrame.spriteFrame.height) {
            unpackedFrame.users.push(loadedFrame.spriteFrame.segments)
            needsAdding = false
            break
          }
        }
        if (needsAdding) {
          unpackedFrames.push({
            spriteFrame: loadedFrame.spriteFrame,
            png: loadedFrame.png,
            users: [loadedFrame.spriteFrame.segments],
            requiredWidth: loadedFrame.spriteFrame.width + 1,
            requiredHeight: loadedFrame.spriteFrame.height + 1
          })
        }
      }
    }

    unpackedFrames.sort((a, b) => {
      // The "most awkward" sprites come first as they'll be harder to pack.
      if (Math.max(a.requiredWidth, a.requiredHeight) > Math.max(b.requiredWidth, b.requiredHeight)) return -1
      if (Math.max(a.requiredWidth, a.requiredHeight) < Math.max(b.requiredWidth, b.requiredHeight)) return 1
      if ((a.requiredWidth * a.requiredHeight) > (b.requiredWidth * b.requiredHeight)) return -1
      if ((a.requiredWidth * a.requiredHeight) < (b.requiredWidth * b.requiredHeight)) return 1
      return 0
    })

    const packedFrames: {
      readonly x: number
      readonly y: number
      readonly unpacked: UnpackedFrame
    }[] = []

    type Space = {
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
    }

    const widthOfWidestSprite = unpackedFrames.reduce((a, b) => Math.max(a, b.requiredWidth), 0) + 1
    const heightOfTallestSprite = unpackedFrames.reduce((a, b) => Math.max(a, b.requiredHeight), 0) + 1
    const totalSpriteArea = unpackedFrames.reduce((a, b) => a + b.requiredWidth * b.requiredHeight, 0)

    let maximumAtlasWidth = 1
    let maximumAtlasHeight = 1

    function expand(): void {
      if (maximumAtlasWidth < maximumAtlasHeight) {
        maximumAtlasWidth *= 2
      } else {
        maximumAtlasHeight *= 2
      }
    }

    while (maximumAtlasWidth < widthOfWidestSprite) {
      maximumAtlasWidth *= 2
    }

    while (maximumAtlasHeight < heightOfTallestSprite) {
      maximumAtlasHeight *= 2
    }

    while (maximumAtlasWidth * maximumAtlasHeight < totalSpriteArea) {
      expand()
    }

    while (true) {
      const spaces: Space[] = [{
        x: 1,
        y: 1,
        width: maximumAtlasWidth,
        height: maximumAtlasHeight
      }]

      for (const frame of unpackedFrames) {
        // If any of the empty spaces can be merged, do it here.
        while (true) {
          let nothingToOptimize = true
          for (const space of spaces) for (const otherSpace of spaces) {
            if (space.x !== otherSpace.x) continue
            if (space.width !== otherSpace.width) continue
            if (space.y + space.height !== otherSpace.y && otherSpace.y + otherSpace.height !== space.y) continue
            spaces.splice(spaces.indexOf(space), 1)
            spaces.splice(spaces.indexOf(otherSpace), 1)
            spaces.push({
              x: space.x,
              y: Math.min(space.y, otherSpace.y),
              width: space.width,
              height: space.height + otherSpace.height
            })
            nothingToOptimize = false
            break
          }
          if (!nothingToOptimize) continue
          for (const space of spaces) for (const otherSpace of spaces) {
            if (space.y !== otherSpace.y) continue
            if (space.height !== otherSpace.height) continue
            if (space.x + space.width !== otherSpace.x && otherSpace.x + otherSpace.width !== space.x) continue
            spaces.splice(spaces.indexOf(space), 1)
            spaces.splice(spaces.indexOf(otherSpace), 1)
            spaces.push({
              x: Math.min(space.x, otherSpace.x),
              y: space.y,
              width: space.width + otherSpace.width,
              height: space.height
            })
            nothingToOptimize = false
            break
          }
          if (!nothingToOptimize) continue
          break
        }

        let found = false
        for (const space of spaces) {
          if (space.width !== frame.requiredWidth || space.height !== frame.requiredHeight) continue
          found = true
          packedFrames.push({
            x: space.x,
            y: space.y,
            unpacked: frame
          })
          spaces.splice(spaces.indexOf(space), 1)
          break
        }
        if (found) continue

        function findWidthFit(): boolean {
          let bestSpace: Space | undefined = undefined
          for (const space of spaces) {
            if (space.width !== frame.requiredWidth) continue
            if (space.height < frame.requiredHeight) continue
            if (bestSpace && bestSpace.height < space.height) continue
            bestSpace = space
          }
          if (!bestSpace) return false
          packedFrames.push({
            x: bestSpace.x,
            y: bestSpace.y,
            unpacked: frame
          })
          spaces.splice(spaces.indexOf(bestSpace), 1)
          spaces.push({
            x: bestSpace.x,
            y: bestSpace.y + frame.requiredHeight,
            width: bestSpace.width,
            height: bestSpace.height - frame.requiredHeight
          })
          return true
        }

        function findHeightFit(): boolean {
          let bestSpace: Space | undefined = undefined
          for (const space of spaces) {
            if (space.height !== frame.requiredHeight) continue
            if (space.width < frame.requiredWidth) continue
            if (bestSpace && bestSpace.width < space.width) continue
            bestSpace = space
          }
          if (!bestSpace) return false
          packedFrames.push({
            x: bestSpace.x,
            y: bestSpace.y,
            unpacked: frame
          })
          spaces.splice(spaces.indexOf(bestSpace), 1)
          spaces.push({
            x: bestSpace.x + frame.requiredWidth,
            y: bestSpace.y,
            width: bestSpace.width - frame.requiredWidth,
            height: bestSpace.height
          })
          return true
        }

        if (frame.requiredWidth >= frame.requiredHeight) {
          found = findWidthFit() || findHeightFit()
        } else {
          found = findHeightFit() || findWidthFit()
        }

        if (!found) {
          // Find the "most awkward" space for this frame, even if it wastes space to right and bottom; it might still get filled.
          let bestSpace: Space | undefined = undefined
          for (const space of spaces) {
            if (space.width < frame.requiredWidth) continue
            if (space.height < frame.requiredHeight) continue
            if (bestSpace && Math.min(bestSpace.width - frame.requiredWidth, bestSpace.height - frame.requiredHeight) < Math.min(space.width - frame.requiredWidth, space.height - frame.requiredHeight)) continue
            bestSpace = space
          }
          if (!bestSpace) {
            expand()
            packedFrames.length = 0
            break
          }
          packedFrames.push({
            x: bestSpace.x,
            y: bestSpace.y,
            unpacked: frame
          })
          spaces.splice(spaces.indexOf(bestSpace), 1)
          if (bestSpace.width - frame.requiredWidth > bestSpace.height - frame.requiredHeight) {
            spaces.push({
              x: bestSpace.x + frame.requiredWidth,
              y: bestSpace.y,
              width: bestSpace.width - frame.requiredWidth,
              height: bestSpace.height
            })
            spaces.push({
              x: bestSpace.x,
              y: bestSpace.y + frame.requiredHeight,
              width: frame.requiredWidth,
              height: bestSpace.height - frame.requiredHeight
            })
          } else {
            spaces.push({
              x: bestSpace.x,
              y: bestSpace.y + frame.requiredHeight,
              width: bestSpace.width,
              height: bestSpace.height - frame.requiredHeight
            })
            spaces.push({
              x: bestSpace.x + frame.requiredWidth,
              y: bestSpace.y,
              width: bestSpace.width - frame.requiredWidth,
              height: frame.requiredHeight
            })
          }
        }
      }

      if (packedFrames.length < unpackedFrames.length) {
        continue
      }

      const width = Math.max.apply(Math, packedFrames.map(frame => frame.x + frame.unpacked.requiredWidth))
      const height = Math.max.apply(Math, packedFrames.map(frame => frame.y + frame.unpacked.requiredHeight))
      const atlas = new pngjs.PNG({
        width,
        height
      })
      for (const frame of packedFrames) {
        frame.unpacked.png.bitblt(
          atlas,
          frame.unpacked.spriteFrame.sheetX,
          frame.unpacked.spriteFrame.sheetY,
          frame.unpacked.spriteFrame.width,
          frame.unpacked.spriteFrame.height,
          frame.x,
          frame.y
        )
      }
      await png.write(atlas, paths.artifactsFile(`atlas.png`))
      const output: types.PackedItem[] = []
      packedFrames.forEach(packedFrame => packedFrame.unpacked.users.forEach(user => output.push({
        segments: user,
        code: {
          type: `Sprite`,
          value: `new Sprite(${packedFrame.x}, ${packedFrame.y}, ${packedFrame.unpacked.spriteFrame.width}, ${packedFrame.unpacked.spriteFrame.height}, ${packedFrame.unpacked.spriteFrame.offsetX}, ${packedFrame.unpacked.spriteFrame.offsetY})`
        }
      })))
      return {
        code: `
const atlasWidth = ${width}
const atlasHeight = ${height}
`,
        items: output,
        packed: {}
      }
    }
  },

  async deletePacked(
    packed: types.Packed<"sprite">
  ): Promise<void> {

  }
}

export default exported
