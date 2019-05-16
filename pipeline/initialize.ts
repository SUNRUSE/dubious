import * as fs from "fs"
import * as path from "path"
import * as util from "util"
import * as _mkdirp from "mkdirp"
import * as _rimraf from "rimraf"
import * as types from "./types"
import * as paths from "./paths"
import settings from "./settings"
import * as utilities from "./utilities"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const mkdirp = util.promisify(_mkdirp)
const rimraf = util.promisify(_rimraf)

export default async function () {
  // These are always done as they aren't in different places if localization or environment are changed.
  console.log(`Creating TypeScript project file...`)
  await fsWriteFile(
    paths.typescriptProjectFile(),
    JSON.stringify({
      files: [`index.generated.ts`],
      compilerOptions: {
        allowJs: false,
        allowUnreachableCode: false,
        allowUnusedLabels: false,
        noEmitOnError: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noImplicitReturns: true,
        noUnusedLocals: true,
        noFallthroughCasesInSwitch: true,
        noImplicitThis: true,
        target: "es5",
        outFile: path.join(paths.toRootFromSrcDirectory, paths.tempIndexFile())
      }
    })
  )

  console.log(`Creating TypeScript index file...`)
  await fsWriteFile(
    paths.typescriptIndexFile(),
    `/// <reference path="${paths.toRootFromSrcDirectory}/engine/${settings.development ? `development` : `production`}/index.ts" />
/// <reference path="${paths.toRootFromSrcDirectory}/engine/shared/index.ts" />
/// <reference path="content.generated.ts" />
/// <reference path="index.ts" />

// This file was generated by a tool, and should not be directly modified.
`
  )

  console.log(`Checking for existing build...`)

  let stateText: null | string = null
  try {
    stateText = await fsReadFile(paths.stateFile(), { encoding: `utf8` })
  } catch (e) {
    if (e.code !== `ENOENT`) {
      throw e
    }
  }

  if (stateText === null) {
    console.log(`Build never performed, or incomplete (state file missing).`)
  } else {
    const state: types.State = JSON.parse(stateText)
    if (state.version !== types.stateVersion) {
      console.log(`State file version mismatch (expected ${types.stateVersion}, actual ${state.version}).`)
    } else {
      console.log(`State file read and as expected.`)
      return
    }
  }

  console.log(`Deleting temp directory...`)
  await rimraf(paths.tempDirectory())

  console.log(`Deleting artifacts directory...`)
  await rimraf(paths.artifactsDirectory())
  const state: types.State = {
    firstRun: true,
    version: types.stateVersion,
    cacheBustingFileUsers: {},
    contentVersions: {},
    packedContentMetadata: {
      data: {
        code: ``,
        items: [],
        packed: {}
      },
      sprite: {
        code: ``,
        items: [],
        packed: {
          filename: ``
        }
      },
      background: {
        code: ``,
        items: [],
        packed: {}
      },
      sound: {
        code: ``,
        items: [],
        packed: {
          filename: ``,
          extensions: []
        }
      },
      song: {
        code: ``,
        items: [],
        packed: {}
      }
    }
  }

  console.log(`Creating temp directory...`)
  await mkdirp(paths.tempDirectory())

  console.log(`Creating artifacts directory...`)
  await mkdirp(paths.artifactsDirectory())

  await utilities.asyncProgressBar(
    `Creating imported cache files...`,
    Object.keys(types.PurposeExtensionValue),
    true,
    async purposeString => {
      const purpose = purposeString as types.Purpose
      await mkdirp(paths.importedPurposeDirectory(purpose))
      await fsWriteFile(paths.importedPurposeCache(purpose), JSON.stringify({}))
    }
  )

  console.log(`Writing state file...`)
  await fsWriteFile(paths.stateFile(), JSON.stringify(state))
}
