export interface JsonArray extends ReadonlyArray<Json> { }

export type Json =
  | string
  | number
  | boolean
  | JsonArray
  | JsonObject
  | null

export type JsonObject = {
  readonly [key: string]: Json
}

export type Purpose = `data` | `sprite` | `background` | `sound` | `song`

export type ImportedPurpose = {
  readonly data: PackedItem
  readonly sprite: {
    readonly segments: ReadonlyArray<string>
    readonly pngPath: string
    readonly sheetX: number
    readonly sheetY: number
    readonly width: number
    readonly height: number
    readonly offsetX: number
    readonly offsetY: number
  }
  readonly background: {
    readonly segments: ReadonlyArray<string>
    readonly filename: string
    readonly width: number
    readonly height: number
    readonly offsetX: number
    readonly offsetY: number
  }
  readonly sound: {
    readonly segments: ReadonlyArray<string>
    readonly rawPath: string
    readonly channels: 1 | 2
    readonly gain: number
  }
  readonly song: {
    readonly segments: ReadonlyArray<string>
    readonly filename: string
    readonly extensions: ReadonlyArray<string>
    readonly gain: number
  }
}

export type PackedPurpose = {
  readonly data: {}
  readonly sprite: {
    readonly filename: string
  }
  readonly background: {}
  readonly sound: {
    readonly filename: string
    readonly extensions: ReadonlyArray<string>
  }
  readonly song: {}
}

export type ImportedPurposeFile<TPurpose extends Purpose> = {
  [file: string]: ReadonlyArray<ImportedPurpose[TPurpose]>
}

export type PurposeExtensionType = {
  readonly data: `json` | `csv`
  readonly sprite: `png` | `ase` | `aseprite`
  readonly background: `png` | `ase` | `aseprite`
  readonly sound: `wav` | `flac`
  readonly song: `wav` | `flac`
}

export const PurposeExtensionValue: {
  readonly [TPurpose in Purpose]: ReadonlyArray<PurposeExtensionType[TPurpose]>
} = {
  data: [`json`, `csv`],
  sprite: [`png`, `ase`, `aseprite`],
  background: [`png`, `ase`, `aseprite`],
  sound: [`wav`, `flac`],
  song: [`wav`, `flac`]
}

export type PurposeImplementation = {
  readonly [TPurpose in Purpose]: {
    delete(
      state: State,
      content: ContentReference<TPurpose, PurposeExtensionType[TPurpose]>,
      imported: ReadonlyArray<ImportedPurpose[TPurpose]>
    ): Promise<void>
    import(
      state: State,
      content: ContentReference<TPurpose, PurposeExtensionType[TPurpose]>
    ): Promise<ReadonlyArray<ImportedPurpose[TPurpose]>>
    pack(
      state: State,
      imported: ReadonlyArray<ImportedPurpose[TPurpose]>
    ): Promise<Packed<TPurpose>>
    deletePacked(
      state: State,
      packed: Packed<TPurpose>
    ): Promise<void>
  }
}

export type PackedItem = {
  readonly segments: ReadonlyArray<string>
  readonly code: {
    readonly type: string
    readonly value: string
  }
}

export type Packed<TPurpose extends Purpose> = {
  readonly items: ReadonlyArray<PackedItem>
  readonly code: string
  readonly packed: PackedPurpose[TPurpose]
}

export const stateVersion = 32

export type State = {
  firstRun: boolean
  readonly version: number
  readonly cacheBustingFileUsers: {
    [filename: string]: number
  }
  contentVersions: {
    readonly [filename: string]: string
  }
  readonly packedContentMetadata: {
    [TPurpose in Purpose]: Packed<TPurpose>
  }
}

export type ContentReference<TPurpose extends string, TExtension extends string> = {
  readonly source: string
  readonly segments: string[]
  readonly purpose: TPurpose
  readonly extension: TExtension
}

export type ResolvedContentReference<TPurpose extends Purpose> = ContentReference<TPurpose, PurposeExtensionType[TPurpose]>

export type MetadataContent = {
  readonly source: string
  readonly name: string
  readonly extension: string
}
