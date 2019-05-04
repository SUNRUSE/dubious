import * as fs from "fs"
import * as util from "util"
import * as paths from "./paths"
import * as types from "./types"
import * as utilities from "./utilities"
import * as audio from "./audio"

const fsUnlink = util.promisify(fs.unlink)

const exported: types.PurposeImplementation["song"] = {
  async delete(
    common: types.ImportedCommonPurpose["song"],
    content: types.ContentReference<"song", types.PurposeExtensionType["song"]>,
    imported: ReadonlyArray<types.ImportedPurpose["song"]>
  ): Promise<void> {
    for (const item of imported) {
      common.ids.splice(common.ids.indexOf(item.id), 1)
      await fsUnlink(paths.artifactsFile(`song-${item.id}`))
    }
  },

  async import(
    common: types.ImportedCommonPurpose["song"],
    content: types.ContentReference<"song", types.PurposeExtensionType["song"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["song"]>> {
    const read = await audio.read(content)
    if (read) {
      const id = utilities.findNextId(common.ids)
      await audio.write(read.samples, paths.artifactsFile(`song-${id}`))
      return [{
        segments: utilities.preprocessSegments(content.segments, []),
        id,
        gain: read.gain
      }]
    } else {
      return []
    }
  },

  async pack(
    imported: ReadonlyArray<types.ImportedPurpose["song"]>
  ): Promise<types.Packed<"song">> {
    return {
      code: ``,
      items: imported.map(song => ({
        segments: song.segments,
        code: {
          type: `Song`,
          value: `new Song(${song.id}, ${song.gain}, ${song.gain})`
        }
      })),
      packed: {}
    }
  },

  async deletePacked(
    packed: types.Packed<"song">
  ): Promise<void> {

  }
}

export default exported
