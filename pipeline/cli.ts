import * as path from "path"
import * as fs from "fs"
import * as util from "util"
import * as readline from "readline"
import * as utilities from "./utilities"
import settings from "./settings"
import initialize from "./initialize"
import oneOff from "./one-off"
import watch from "./watch"

const fsReaddir = util.promisify(fs.readdir)

async function program(): Promise<void> {
  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true)
  }
  process.stdin.on('keypress', (str: string, key?: {
    readonly name: string
    readonly ctrl: boolean
  }): void => {
    if (key && key.name === `c` && key.ctrl) {
      process.exit(0)
    }
  })

  function promptOptionalNumber(question: string, initial: null | number): Promise<null | number> {
    return new Promise<null | number>((fulfill, reject) => {
      console.log()
      console.log(question)

      let value = initial === null ? `` : `${initial}`

      render()

      process.stdin.on('keypress', onKeypress)

      function onKeypress(str: string, key?: { readonly name: string }): void {
        if (key) {
          switch (key.name) {
            case `0`:
            case `1`:
            case `2`:
            case `3`:
            case `4`:
            case `5`:
            case `6`:
            case `7`:
            case `8`:
            case `9`:
              value += key.name
              render()
              break
            case `backspace`:
              value = value.slice(0, value.length - 1)
              render()
              break
            case `return`:
              process.stdin.removeListener(`keypress`, onKeypress)
              render()
              fulfill(value === `` ? null : parseInt(value))
              break
          }
        }
      }

      function render(): void {
        console.log()
        console.log(` > ${value}`)
      }
    })
  }

  function promptMultipleChoice<T extends string>(question: string, options: T[]): Promise<T> {
    return new Promise<T>((fulfill, reject) => {
      console.log()
      console.log(question)
      let selectedIndex = 0
      render()

      if (options.length) {
        process.stdin.on('keypress', onKeypress)
      }

      function onKeypress(str: string, key?: { readonly name: string }): void {
        if (key) {
          if (key.name === `up`) {
            if (selectedIndex) {
              selectedIndex--
            } else {
              selectedIndex = options.length - 1
            }
            render()
          } else if (key.name === `down`) {
            if (selectedIndex < options.length - 1) {
              selectedIndex++
            } else {
              selectedIndex = 0
            }
            render()
          } else if (key.name === `return`) {
            process.stdin.removeListener(`keypress`, onKeypress)
            console.log()
            console.log(` > ${options[selectedIndex]}`)
            fulfill(options[selectedIndex])
          }
        }
      }

      function render(): void {
        console.log()
        if (options.length) {
          options.forEach((option, index) => console.log(
            ` ${selectedIndex === index ? `>` : ` `} ${option}`
          ))
        } else {
          console.log(`(there are no available options)`)
        }
      }
    })
  }

  switch (await promptMultipleChoice(
    `What do you want to do?`,
    [
      `Develop a specific game/localization`,
      `Build a specific game`,
      `Build all games`
    ]
  )) {
    case `Develop a specific game/localization`: {
      settings.development = true
      console.log(`Searching for games...`)
      const games = await fsReaddir(`games`)
      games.sort()
      settings.game = await promptMultipleChoice(`Select a game to develop:`, games)
      console.log(`Searching for localizations...`)
      const localizations = await fsReaddir(path.join(`games`, settings.game, `localizations`))
      localizations.sort()
      settings.localization = await promptMultipleChoice(`Select a localization to develop:`, localizations)
      settings.host = await promptOptionalNumber(`Host port (blank for none):`, 5000)
      console.log(`Performing initial content build...`)
      await initialize()
      await oneOff()
      utilities.revokeAllCaches()
      console.log(`Watching for content changes...`)
      await watch()
    } break
    case `Build a specific game`: {
      console.log(`Searching for games...`)
      const games = await fsReaddir(`games`)
      games.sort()
      settings.game = await promptMultipleChoice(`Select a game to build:`, games)
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
      console.log(`Done.`)
      process.exit(0)
    } break
    case `Build all games`: {
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
    } break
  }
}

program().then(
  () => { },
  (error: any) => {
    console.error(error)
    process.exit(1)
  }
)
