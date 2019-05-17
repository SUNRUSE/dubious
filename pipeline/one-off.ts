import * as fs from "fs"
import * as util from "util"
import * as recursiveReaddir from "recursive-readdir"
import shellExecute from "./shell-execute"
import settings from "./settings"
import * as paths from "./paths"
import * as utilities from "./utilities"
import run from "./run"
import * as html from "./html"

const fsStat = util.promisify(fs.stat)

export default async function (): Promise<void> {
  const contentVersions: {
    [filename: string]: string
  } = {}
  if (settings.ci) {
    const fileList = await shellExecute(
      `Get file hashes from Git.`,
      `git`,
      [`ls-files`, `--stage`]
    )

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
  const output = await shellExecute(
    `Invoke TypeScript compiler.`,
    paths.tsc,
    [`--project`, paths.typescriptProjectFile()]
  )
  output
    .split(`\n`)
    .filter(line => line !== ``)
    .forEach(line => console.log(`[Typescript] ${line.trim()}`))
  await html.generateHtml()
}
