import * as fs from "fs"
import * as util from "util"
import * as pngjs from "pngjs"
import * as _rimraf from "rimraf"
import * as uuid from "uuid"
const pngcrushBin = require(`pngcrush-bin`)
import shellExecute from "./shell-execute"
import * as paths from "./paths"
import * as types from "./types"
import * as utilities from "./utilities"
import settings from "./settings"
import * as cacheBusting from "./cache-busting"

const fsReadFile = util.promisify(fs.readFile)
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
  for (let pixel = 0; pixel < png.data.length; pixel += 4) {
    const alpha = png.data[pixel + 3] / 255
    png.data[pixel] = Math.floor(255 * Math.pow(png.data[pixel] / 255, 1.0 / 2.2) * alpha)
    png.data[pixel + 1] = Math.floor(255 * Math.pow(png.data[pixel + 1] / 255, 1.0 / 2.2) * alpha)
    png.data[pixel + 2] = Math.floor(255 * Math.pow(png.data[pixel + 2] / 255, 1.0 / 2.2) * alpha)
  }
  return png
}

export async function writeWithCacheBusting(
  state: types.State,
  fromPng: pngjs.PNG
): Promise<string> {
  const temp = paths.tempFile(uuid.v4())
  try {
    await write(fromPng, temp)
    const contents = await fsReadFile(temp)
    const filename = cacheBusting.generateFilename(contents)
    await cacheBusting.request(state, `${filename}.png`, contents)
    return filename
  } finally {
    await rimraf(temp)
  }
}

export async function write(
  fromPng: pngjs.PNG,
  toFile: string
): Promise<void> {
  const writeStream = fs.createWriteStream(toFile)
  fromPng.pack().pipe(writeStream)
  await new Promise((resolve, reject) => writeStream
    .on(`error`, reject)
    .on(`finish`, resolve)
  )
  if (!settings.development) {
    await shellExecute(
      `Invoke pngcrush to compress "${toFile}".`,
      pngcrushBin,
      [`-brute`, `-force`, `-q`, `-reduce`, `-ow`, toFile]
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
