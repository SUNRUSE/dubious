import * as crypto from "crypto"
import * as fs from "fs"
import * as util from "util"
import * as types from "./types"
import * as paths from "./paths"

const fsWriteFile = util.promisify(fs.writeFile)

export function generateFilename(
  contents: Buffer
): string {
  return crypto.createHash(`sha256`).update(contents).digest(`hex`)
}

export async function request(
  state: types.State,
  filename: string,
  contents: Buffer
): Promise<void> {
  if (Object.prototype.hasOwnProperty.call(state.cacheBustingFileUsers, filename)) {
    state.cacheBustingFileUsers[filename]++
  } else {
    state.cacheBustingFileUsers[filename] = 1
    await fsWriteFile(paths.artifactsFile(filename), contents)
  }
}

export async function release(
  state: types.State,
  filename: string
): Promise<void> {
  if (state.cacheBustingFileUsers[filename] === 1) {
    fs.unlinkSync(paths.artifactsFile(filename))
    delete state.cacheBustingFileUsers[filename]
  } else {
    state.cacheBustingFileUsers[filename]--
  }
}
