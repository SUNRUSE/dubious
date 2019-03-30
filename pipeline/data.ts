import * as util from "util"
import * as fs from "fs"
import * as csvParser from "csv-parser"
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
    switch (content.extension) {
      case `json`:
        const text = await fsReadFile(content.source, { encoding: `utf8` })
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
        break

      case `csv`:
        let emittedRows = 0
        await new Promise((resolve, reject) => {
          fs.createReadStream(content.source)
            .on(`error`, reject)
            .pipe(csvParser())
            .on(`error`, reject)
            .on(`data`, data => {
              const rowKey = Object.prototype.hasOwnProperty.call(data, `key`)
                ? data.key
                : `${emittedRows}`

              emittedRows++

              for (const columnKey in data) {
                if (columnKey === `key`) {
                  continue
                }
                const value = data[columnKey]
                if (value === ``) {
                  continue
                }
                let code: string
                if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
                  code = value
                } else if (value.toLowerCase() === `true`) {
                  code = `true`
                } else if (value.toLowerCase() === `false`) {
                  code = `false`
                } else if (value.toLowerCase() === `null`) {
                  code = `null`
                } else {
                  code = JSON.stringify(value)
                }
                output.push({
                  segments: utilities.preprocessSegments(content.segments, [rowKey, columnKey]),
                  code
                })
              }
            })
            .on(`end`, resolve)
        })
        break
    }
    return output
  },

  async pack(
    imported: ReadonlyArray<types.ImportedPurpose["data"]>
  ): Promise<types.Packed> {
    return {
      code: ``,
      items: imported
    }
  }
}

export default exported
