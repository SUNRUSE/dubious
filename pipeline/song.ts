import * as types from "./types"
import * as utilities from "./utilities"
import * as audio from "./audio"
import * as cacheBusting from "./cache-busting"

const exported: types.PurposeImplementation["song"] = {
  async delete(
    state: types.State,
    content: types.ContentReference<"song", types.PurposeExtensionType["song"]>,
    imported: ReadonlyArray<types.ImportedPurpose["song"]>
  ): Promise<void> {
    for (const item of imported) {
      for (const extension of item.extensions) {
        await cacheBusting.release(state, `${item.filename}.${extension}`)
      }
    }
  },

  async import(
    state: types.State,
    content: types.ContentReference<"song", types.PurposeExtensionType["song"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["song"]>> {
    const read = await audio.read(content)
    if (read) {
      const written = await audio.write(state, read.samples)
      return [{
        segments: utilities.preprocessSegments(content.segments, []),
        filename: written.filename,
        extensions: written.extensions,
        gain: read.gain
      }]
    } else {
      return []
    }
  },

  async pack(
    state: types.State,
    imported: ReadonlyArray<types.ImportedPurpose["song"]>
  ): Promise<types.Packed<"song">> {
    return {
      code: ``,
      items: imported.map(song => ({
        segments: song.segments,
        code: {
          type: `Song`,
          value: `new Song(${JSON.stringify(song.filename)}, ${song.gain}, ${song.gain})`
        }
      })),
      packed: {}
    }
  },

  async deletePacked(
    state: types.State,
    packed: types.Packed<"song">
  ): Promise<void> {

  }
}

export default exported
