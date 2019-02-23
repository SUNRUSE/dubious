import * as childProcess from "child_process"
import * as fs from "fs"
import * as util from "util"
import * as recursiveReaddir from "recursive-readdir"
import * as paths from "./paths"
import * as utilities from "./utilities"
import run from "./run"

const fsStat = util.promisify(fs.stat)

export default async function (): Promise<void> {
  console.log(`Searching for files...`)
  const contentModifiedDates: {
    [filename: string]: number
  } = {}
  await utilities.asyncProgressBar(
    `Checking modified dates...`,
    (await recursiveReaddir(paths.srcDirectory())).filter(paths.shouldBeProcessed),
    true,
    async file => contentModifiedDates[file] = (await fsStat(file)).mtime.getTime()
  )
  await run(contentModifiedDates)

  console.log(`Running TypeScript compiler...`)
  const process = childProcess.spawn(
    paths.tsc,
    [`--project`, paths.typescriptProjectFile()]
  )
  process.stdout.setEncoding(`utf8`)
  process.stdout.on(`data`, data => {
    if (data.trim() !== ``) {
      console.log(`[Typescript]: ${data.trim()}`)
    }
  })
  await new Promise((resolve, reject) => process
    .on(`exit`, status => {
      if (status === 0) {
        resolve()
      } else {
        reject(new Error(`Unexpected Typescript compiler exit (${status}).`))
      }
    })
  )
}
