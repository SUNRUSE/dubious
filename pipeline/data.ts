import * as util from "util"
import * as fs from "fs"
import * as types from "./types"
import * as utilities from "./utilities"

const fsReadFile = util.promisify(fs.readFile)

const exported: types.PurposeImplementation["data"] = {
  async delete(
    common: types.ImportedCommonPurpose["data"],
    content: types.ContentReference<"data", types.PurposeExtensionType["data"]>,
    imported: ReadonlyArray<types.ImportedPurpose["data"]>
  ): Promise<void> { },

  async import(
    common: types.ImportedCommonPurpose["data"],
    content: types.ContentReference<"data", types.PurposeExtensionType["data"]>
  ): Promise<ReadonlyArray<types.ImportedPurpose["data"]>> {
    const output: types.ImportedPurpose["data"][] = []
    const text = await fsReadFile(content.source, { encoding: `utf8` })
    switch (content.extension) {
      case `json`:
        const json = JSON.parse(text)
        recurseJson(json, [])

        function recurseJson(element: types.Json, subPaths: ReadonlyArray<string>): void {
          switch (typeof element) {
            case `boolean`:
            case `number`:
            case `string`:
              output.push({
                segments: utilities.preprocessSegments(content.segments, subPaths),
                code: JSON.stringify(element)
              })
              break

            default:
              if (Array.isArray(element)) {
                element.forEach((item, index) => recurseJson(item, subPaths.concat(`${index}`)))
              } else if (element === null) {
                output.push({
                  segments: utilities.preprocessSegments(content.segments, subPaths),
                  code: `null`
                })
              } else {
                // TODO: Is there a way for TypeScript to be aware of this?
                const elementObject = element as types.JsonObject
                for (const key in elementObject) {
                  recurseJson(elementObject[key], subPaths.concat(key))
                }
              }
              break
          }
        }
    }
    return output
  },

  async pack(
    imported: ReadonlyArray<types.ImportedPurpose["data"]>
  ): Promise<ReadonlyArray<types.Packed>> {
    return imported
  }
}

export default exported
