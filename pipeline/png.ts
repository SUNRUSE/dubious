import * as childProcess from "child_process"
import * as fs from "fs"
import * as util from "util"
import * as pngjs from "pngjs"
const pngcrushBin = require(`pngcrush-bin`)
import * as tempfile from "tempfile"
import * as _rimraf from "rimraf"
import * as utilities from "./utilities"
import settings from "./settings"

const rimraf = util.promisify(_rimraf)

export async function read(pngPath: string): Promise<pngjs.PNG> {
  const png = new pngjs.PNG()
  await new Promise((resolve, reject) => {
    fs.createReadStream(pngPath)
      .on(`error`, reject)
      .pipe(png)
      .on(`error`, reject)
      .on(`parsed`, resolve)
  })
  return png
}

export async function write(
  fromPng: pngjs.PNG,
  toFile: string,
  compress: boolean
): Promise<void> {
  if (compress && !settings.development) {
    const temp = tempfile()
    try {
      await write(fromPng, temp, false)
      await new Promise((resolve, reject) => childProcess
        .spawn(
          pngcrushBin,
          [`-brute`, `-force`, `-q`, `-reduce`, temp, toFile]
        ).on(`exit`, status => {
          if (status === 0) {
            resolve()
          } else {
            reject(new Error(`Failed to invoke pngcrush to compress a PNG file.`))
          }
        }))
    } catch (e) {
      await rimraf(temp)
      throw e
    }
  } else {
    const writeStream = fs.createWriteStream(toFile)
    fromPng.pack().pipe(writeStream)
    await new Promise((resolve, reject) => writeStream
      .on(`error`, reject)
      .on(`finish`, resolve)
    )
  }
}

export const cache = new utilities.KeyedCache(read)

export function findTrimBounds(png: pngjs.PNG): null | {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
} {
  let top = 0
  for (; top < png.height; top++) {
    let x = 0
    for (; x < png.width; x++) {
      if (png.data[(x + top * png.width) * 4 + 3]) {
        break
      }
    }
    if (x < png.width) {
      break
    }
  }

  if (top === png.height) {
    return null
  }

  let height = png.height - top - 1
  for (; height > 0; height--) {
    let x = 0
    for (; x < png.width; x++) {
      if (png.data[(x + (top + height) * png.width) * 4 + 3]) {
        break
      }
    }
    if (x < png.width) {
      break
    }
  }
  height++

  let left = 0
  for (; left < png.width; left++) {
    let y = 0
    for (; y < height; y++) {
      if (png.data[(left + (top + y) * png.width) * 4 + 3]) {
        break
      }
    }
    if (y < height) {
      break
    }
  }

  let width = png.width - left - 1
  for (; width > 0; width--) {
    let y = 0
    for (; y < height; y++) {
      if (png.data[(left + width + (top + y) * png.width) * 4 + 3]) {
        break
      }
    }
    if (y < height) {
      break
    }
  }
  width++

  return { left, top, width, height }
}

export function trim(png: pngjs.PNG): null | {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly png: pngjs.PNG
} {
  const bounds = findTrimBounds(png)
  if (!bounds) {
    return null
  }

  const trimmed = new pngjs.PNG({
    width: bounds.width + 2,
    height: bounds.height + 2
  })

  png.bitblt(trimmed, bounds.left, bounds.top, bounds.width, bounds.height, 1, 1)

  return {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    png: trimmed
  }
}
