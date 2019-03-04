import * as os from "os"
import * as fs from "fs"
import * as path from "path"
import * as util from "util"
import settings from "./settings"
import * as utilities from "./utilities"

const fsStat = util.promisify(fs.stat)

export const executableConfiguration = new utilities.AsyncCache(async () => {
  const options = [
    [`ephemeral`, `aseprite-bin`, `aseprite`],
    [`ephemeral`, `aseprite-bin`, `aseprite.exe`],
    [`aseprite`],
    [os.homedir(), `.steam`, `steam`, `steamapps`, `common`, `Aseprite`, `aseprite`]
  ]
  const programFiles = process.env[`PROGRAMFILES`]
  if (programFiles !== undefined) {
    options.push([programFiles, `Steam`, `steamapps`, `common`, `Aseprite`, `aseprite.exe`])
  }
  const programFiles86 = process.env[`PROGRAMFILES(x86)`]
  if (programFiles86 !== undefined) {
    options.push([programFiles86, `Steam`, `steamapps`, `common`, `Aseprite`, `aseprite.exe`])
  }
  for (const option of options) {
    const joined: string = path.join.apply(path, option)
    try {
      await fsStat(joined)
    } catch (e) {
      if (e.code === `ENOENT`) {
        continue
      } else {
        throw e
      }
    }
    console.log(`Selected "${joined}" as Aseprite executable path.`)
    return settings.ci
      ? {
        path: `xvfb-run`,
        prefixedArguments: [joined]
      }
      : {
        path: joined,
        prefixedArguments: []
      }
  }
  throw new Error(`No Aseprite executable found.`)
})

export function getFrameIds(frameTag: {
  readonly from: number
  readonly to: number
  readonly direction: `forward` | `reverse` | `pingpong`
}): ReadonlyArray<number> {
  const frameIds: number[] = []
  switch (frameTag.direction) {
    case `forward`:
      for (let i = frameTag.from; i <= frameTag.to; i++) {
        frameIds.push(i)
      }
      break
    case `reverse`:
      for (let i = frameTag.to; i >= frameTag.from; i--) {
        frameIds.push(i)
      }
      break
    case `pingpong`:
      for (let i = frameTag.from; i <= frameTag.to; i++) {
        frameIds.push(i)
      }
      for (let i = frameTag.to - 1; i >= frameTag.from + 1; i--) {
        frameIds.push(i)
      }
      break
  }
  return frameIds
}
