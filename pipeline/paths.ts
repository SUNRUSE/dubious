import * as path from "path"
import * as types from "./types"
import settings from "./settings"

// Ignores:
// some-path/.including-this/thing
// some-path/including-this/thing~
// games/anything/tsconfig.json
// games/anything/abc.ts
// games/anything/abc/def.ts
export const shouldBeProcessed = (file: string): boolean => !/[\\\/]\.|~$|^games[\\\/][^\\\/]+[\\\/]tsconfig\.json$|\.ts$/.test(file)

export const srcDirectory = () => path.join(`games`, settings.game)
export const srcFile = (file: string): string => path.join(srcDirectory(), file)

export const ephemeralDirectory = `ephemeral`

export const environmentDirectory = () => path.join(
  ephemeralDirectory,
  `environments`, settings.development ? `development` : `production`
)

export const tempDirectory = () => path.join(
  environmentDirectory(),
  `temp`,
  settings.game,
  settings.localization
)

export const tempFile = (name: string): string => path.join(tempDirectory(), name)

export const typescriptProjectFile = () => srcFile(`tsconfig.json`)
export const typescriptIndexFile = () => srcFile(`index.generated.ts`)
export const typescriptContentFile = () => srcFile(`content.generated.ts`)
export const toRootFromEphemeralDirectory = `../../../../../..`
export const toRootFromSrcDirectory = `../..`

export const artifactsDirectory = () => path.join(
  environmentDirectory(),
  `artifacts`,
  settings.game,
  settings.localization
)

export const artifactsFile = (name: string) => path.join(artifactsDirectory(), name)
export const artifactsIndexFile = () => artifactsFile(`index.js`)

export const stateFile = () => tempFile(`state.json`)

export function analyze(file: string): null | types.ContentReference<string, string> {
  const match = file.match(/^games[\\\/]([^\\\/]+)[\\\/]([^.]+)(?:\.([a-z-]+))?\.([a-z]+)\.([a-z]+)$/)
  if (!match) {
    return null
  }
  const game = match[1]
  if (game !== settings.game) {
    return null
  }
  const localization = match[3]
  if (localization !== undefined && localization !== settings.localization) {
    return null
  }
  const segments = match[2].split(/[\\\/]/)
  const purpose = match[4]
  const extension = match[5]
  return {
    source: path.join.apply(
      path,
      [`games`, settings.game]
        .concat(segments.slice(0, segments.length - 1))
        .concat([
          localization === undefined
            ? `${segments[segments.length - 1]}.${purpose}.${extension}`
            : `${segments[segments.length - 1]}.${localization}.${purpose}.${extension}`
        ])
    ),
    segments,
    purpose,
    extension
  }
}

export function isMetadataJson(file: string): boolean {
  const match = file.match(/^games[\\\/]([^\\\/]+)[\\\/]metadata\.json$/)
  if (!match) {
    return false
  }
  const game = match[1]
  if (game !== settings.game) {
    return false
  }
  return true
}

export function analyzeLocalizationMetadata(file: string): null | types.MetadataContent {
  const match = file.match(/^games[\\\/]([^\\\/]+)[\\\/]localizations[\\\/]([^\\\/]+)[\\\/]([^\.\\\/]+)\.([^\.\\\/]+)$/)
  if (!match) {
    return null
  }
  const game = match[1]
  if (game !== settings.game) {
    return null
  }
  const localization = match[2]
  if (localization !== settings.localization) {
    return null
  }
  const name = match[3]
  const extension = match[4]
  return {
    source: file,
    name,
    extension
  }
}

export const importedPurposeDirectory = (purpose: types.Purpose): string => tempFile(path.join(`imported`, purpose))

export const importedPurposeFile = (
  purpose: types.Purpose,
  file: string
): string => path.join(importedPurposeDirectory(purpose), file)

export const importedPurposeCache = (purpose: types.Purpose) => importedPurposeFile(purpose, `imported-cache.json`)

export const importedDirectory = (
  content: types.ContentReference<types.Purpose, string>
): string => path.join.apply(
  path,
  [importedPurposeDirectory(content.purpose), content.extension]
    .concat(content.segments)
)

export const importedFile = (
  content: types.ContentReference<types.Purpose, string>,
  file: string
): string => path.join(importedDirectory(content), file)

export const tsc = path.join(`node_modules`, `.bin`, `tsc`)
