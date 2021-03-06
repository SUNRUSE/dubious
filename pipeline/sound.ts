import * as fs from "fs"
import * as util from "util"
import * as _rimraf from "rimraf"
import * as _mkdirp from "mkdirp"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"
import * as audio from "./audio"
import * as cacheBusting from "./cache-busting"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const rimraf = util.promisify(_rimraf)
const mkdirp = util.promisify(_mkdirp)
export const cache = new utilities.KeyedCache(async path => new Float32Array(await fsReadFile(path)))

const exported: types.PurposeImplementation["sound"] = {
  async delete(
    state: types.State,
    content: types.ContentReference<"sound", types.PurposeExtensionType["sound"]>,
    imported: ReadonlyArray<types.ImportedPurpose["sound"]>
  ): Promise<void> {
    cache.revoke(paths.importedFile(content, `raw.bin`))
    await rimraf(paths.importedDirectory(content))
  },

  async import(
    state: types.State,
    content: types.ContentReference<"sound", types.PurposeExtensionType["sound"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["sound"]>> {
    const read = await audio.read(content)
    if (read) {
      const rawPath = paths.importedFile(content, `raw.bin`)
      await mkdirp(paths.importedDirectory(content))
      const asFloat32Array = new Float32Array(read.samples.length === 2 ? read.samples[0].concat(read.samples[1]) : read.samples[0])
      cache.set(rawPath, Promise.resolve(asFloat32Array))
      await fsWriteFile(
        rawPath,
        Buffer.from(asFloat32Array)
      )
      return [{
        segments: utilities.preprocessSegments(content.segments, []),
        rawPath,
        channels: read.samples.length,
        gain: read.gain
      }]
    } else {
      return []
    }
  },

  async pack(
    state: types.State,
    imported: ReadonlyArray<types.ImportedPurpose["sound"]>
  ): Promise<types.Packed<"sound">> {
    type UnpackedSound = {
      readonly sound: types.ImportedPurpose["sound"]
      readonly raw: Float32Array
    }

    const unpackedSounds: UnpackedSound[] = await utilities.asyncProgressBar(`Reading sounds...`, imported, true, async sound => {
      return {
        sound: sound,
        raw: await cache.get(sound.rawPath)
      }
    })

    const left: number[] = []
    const right: number[] = []

    const output: types.PackedItem[] = []

    for (const unpackedSound of unpackedSounds) {
      output.push({
        segments: unpackedSound.sound.segments,
        code: {
          type: `Sound`,
          value: `new Sound(${left.length}, ${unpackedSound.raw.length / unpackedSound.sound.channels}, ${unpackedSound.sound.gain}, ${unpackedSound.sound.gain})`
        }
      })
      if (unpackedSound.sound.channels === 1) {
        unpackedSound.raw.forEach(sample => left.push(sample))
        unpackedSound.raw.forEach(sample => right.push(sample))
      } else {
        for (let i = 0; i < unpackedSound.raw.length / 2; i++) {
          left.push(unpackedSound.raw[i])
        }
        for (let i = unpackedSound.raw.length / 2; i < unpackedSound.raw.length; i++) {
          right.push(unpackedSound.raw[i])
        }
      }
    }

    const written = await audio.write(state, [left, right])

    return {
      code: `const atlasSound = new FileAudioBuffer(${JSON.stringify(written.filename)})`,
      items: output,
      packed: written
    }
  },

  async deletePacked(
    state: types.State,
    packed: types.Packed<"sound">
  ): Promise<void> {
    for (const extension of packed.packed.extensions) {
      await cacheBusting.release(state, `${packed.packed.filename}.${extension}`)
    }
  }
}

export default exported
