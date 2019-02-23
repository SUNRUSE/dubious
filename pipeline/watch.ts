import * as childProcess from "child_process"
import * as fs from "fs"
import * as chokidar from "chokidar"
import * as express from "express"
import * as paths from "./paths"
import settings from "./settings"
import run from "./run"

export default async function (): Promise<void> {
  const port = settings.host
  if (port === null) {
    console.log(`Hosting disabled.`)
  }

  console.log(`Starting web server on port ${port}...`)
  await new Promise((resolve, reject) => express()
    .use(express.static(paths.artifactsDirectory()))
    .listen(port, () => {
      console.log(`Web server started.`)
      resolve()
    })
    .on(`error`, reject)
  )

  const process = childProcess
    .spawn(
      paths.tsc,
      [
        `--project`, paths.typescriptProjectFile(),
        `--watch`, `--preserveWatchOutput`
      ]
    )
  process.stdout.setEncoding(`utf8`)
  process.stdout.on(`data`, data => {
    if (data.trim() !== ``) {
      console.log(`[Typescript]: ${data.trim()}`)
    }
  })
  process.on(`exit`, status => {
    throw new Error(`Unexpected Typescript compiler exit (${status}).`)
  })

  console.log(`Watching for files...`)
  let running = false
  let invalidated = false
  let throttling: null | NodeJS.Timer = null
  const allPaths: { [path: string]: number } = {}
  let ranAtLeastOnce = false

  chokidar
    .watch(paths.srcDirectory())
    .on(`add`, (path, stats) => handle(`add`, path, stats))
    .on(`change`, (path, stats) => handle(`change`, path, stats))
    .on(`unlink`, path => {
      if (paths.shouldBeProcessed(path)) {
        console.log(`"unlink" of "${path}"`)
        delete allPaths[path]
        invalidate()
      }
    })
    .on(`error`, error => { throw error })

  function handle(event: string, path: string, stats: fs.Stats) {
    if (paths.shouldBeProcessed(path)) {
      if (ranAtLeastOnce) {
        console.log(`"${event}" of "${path}"`)
      }
      if (!stats) {
        throw `No stats for "${event}" of "${path}"`
      }
      allPaths[path] = stats.mtime.getTime()
      invalidate()
    }
  }

  function invalidate() {
    if (running) {
      console.log(`Waiting to restart...`)
      invalidated = true
      return
    }

    if (throttling === null) {
      if (ranAtLeastOnce) {
        console.log(`Throttling...`)
      }
    } else {
      if (ranAtLeastOnce) {
        console.log(`Continuing to throttle...`)
      }
      clearTimeout(throttling)
    }

    throttling = setTimeout(() => {
      console.log(`Starting...`)
      ranAtLeastOnce = true
      throttling = null
      invalidated = false
      running = true
      run(
        JSON.parse(JSON.stringify(allPaths))
      ).then(
        () => {
          running = false
          if (invalidated) {
            invalidate()
          }
        },
        error => {
          console.error(`Failed; "${error}".`)
          running = false
          if (invalidated) {
            invalidate()
          }
        }
      )
    }, ranAtLeastOnce ? 200 : 5000)
  }
}
