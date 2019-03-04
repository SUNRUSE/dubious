import * as childProcess from "child_process"
import * as fs from "fs"
import * as util from "util"
import * as recursiveReaddir from "recursive-readdir"
import settings from "./settings"
import * as paths from "./paths"
import * as utilities from "./utilities"
import run from "./run"

const fsStat = util.promisify(fs.stat)

export default async function (): Promise<void> {
  const contentVersions: {
    [filename: string]: string
  } = {}
  if (settings.ci) {
    const fileList = await new Promise<string>((resolve, reject) => {
      const process = childProcess.spawn(`git`, [`ls-files`, `--stage`])

      let output = ``

      let stdOutClosed = false
      let succeeded: null | boolean = null

      process.stdout.on(`data`, data => output += data)
      process.stdout.on(`close`, () => {
        stdOutClosed = true
        if (succeeded) {
          resolve(output)
        }
      })

      process.on(`exit`, status => {
        succeeded = status === 0
        if (succeeded) {
          if (stdOutClosed) {
            resolve(output)
          }
        } else {
          reject(new Error(`Failed to invoke Git to find files.`))
        }
      })
    })

    const regex = /^\S+\s+(\S+)\s+\S+\s+(\S+)$/gm

    while (true) {
      const match = regex.exec(fileList)
      if (match === null) {
        break
      } else {
        contentVersions[match[2]] = match[1]
      }
    }
  } else {
    console.log(`Searching for files...`)

    await utilities.asyncProgressBar(
      `Checking modified dates...`,
      (await recursiveReaddir(paths.srcDirectory())).filter(paths.shouldBeProcessed),
      true,
      async file => contentVersions[file] = `${(await fsStat(file)).mtime.getTime()}`
    )
  }

  await run(contentVersions)
  console.log(`Running TypeScript compiler...`)
  const process = childProcess.spawn(
    paths.tsc,
    [`--project`, paths.typescriptProjectFile()],
    {
      shell: true
    }
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
