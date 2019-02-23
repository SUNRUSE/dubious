import * as path from "path"
import * as fs from "fs"
import * as util from "util"
import * as utilities from "./utilities"
import settings from "./settings"
import initialize from "./initialize"
import oneOff from "./one-off"

const fsReaddir = util.promisify(fs.readdir)

async function program(): Promise<void> {
  console.log(`Searching for games...`)
  await utilities.asyncProgressBar(
    `Building games...`,
    await fsReaddir(`games`),
    false,
    async game => {
      console.log(`Game ${game}...`)
      settings.game = game
      console.log(`Searching for localizations...`)
      await utilities.asyncProgressBar(
        `Building localizations...`,
        await fsReaddir(path.join(`games`, settings.game, `localizations`)),
        false,
        async localization => {
          console.log(`Localization ${localization}...`)
          settings.localization = localization
          console.log(`Performing content build...`)
          await initialize()
          await oneOff()
          utilities.revokeAllCaches()
        }
      )
    }
  )
  console.log(`Done.`)
  process.exit(0)
}

program().then(
  () => { },
  (error: any) => {
    console.error(error)
    process.exit(1)
  }
)
