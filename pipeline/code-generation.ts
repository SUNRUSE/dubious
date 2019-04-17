import * as fs from "fs"
import * as util from "util"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"

const fsWriteFile = util.promisify(fs.writeFile)

export default async function codeGeneration(
  state: types.State
): Promise<void> {
  type Directory = {
    readonly kind: `directory`
    readonly contents: {
      [segment: string]: Node
    }
  }
  type Content = {
    readonly kind: `content`
    readonly packed: types.PackedItem
  }
  type Node = Directory | Content

  const root: Directory = {
    kind: `directory`,
    contents: {}
  }

  let header = ``

  for (const purpose in state.packedContentMetadata) {
    const packed = state.packedContentMetadata[purpose as types.Purpose]
    header += packed.code
    for (const item of packed.items) {
      let parentDirectory = root
      let i = 0
      for (const segment of item.segments.slice(0, -1)) {
        if (Object.prototype.hasOwnProperty.call(parentDirectory.contents, segment)) {
          const nextDirectory = parentDirectory.contents[segment]
          if (nextDirectory.kind === `content`) {
            utilities.reportNonFatalError(`"${item.segments.slice(0, i).join(`/`)}" is a piece of content, but was expected to be a directory of content by "${item.segments.join(`/`)}".`)
            break
          } else {
            parentDirectory = nextDirectory
          }
        } else {
          const newDirectory: Directory = {
            kind: `directory`,
            contents: {}
          }
          parentDirectory.contents[segment] = newDirectory
          parentDirectory = newDirectory
        }
        i++
      }
      if (i < item.segments.length - 1) {
        continue
      }
      const lastSegment = item.segments[item.segments.length - 1]
      if (Object.prototype.hasOwnProperty.call(parentDirectory.contents, lastSegment)) {
        const collidedWith = parentDirectory.contents[lastSegment]
        if (collidedWith.kind === `content`) {
          utilities.reportNonFatalError(`"${item.segments.join(`/`)}" is defined multiple times.`)
        } else {
          utilities.reportNonFatalError(`"${item.segments.join(`/`)}" is both a directory of content and a piece of content.`)
        }
        continue
      } else {
        parentDirectory.contents[lastSegment] = {
          kind: `content`,
          packed: item
        }
      }
    }
  }

  function recurseType(node: Node, indentation: string): string {
    if (node.kind === `content`) {
      return node.packed.code.type
    } else {
      const asArray: Node[] = []
      while (Object.prototype.hasOwnProperty.call(node.contents, asArray.length)) {
        asArray.push(node.contents[asArray.length])
      }
      let output = ``
      let first = true
      if (asArray.length === Object.keys(node.contents).length) {
        output += `Readonly<[`
        for (const child of asArray) {
          if (first) {
            first = false
          } else {
            output += `,`
          }
          output += `\n${indentation}  `
          output += recurseType(child, `${indentation}  `)
        }
        output += `\n${indentation}]>`
      } else {
        output += `{`
        for (const key in node.contents) {
          if (first) {
            first = false
          } else {
            output += `,`
          }
          output += `\n${indentation}  readonly `
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            output += key
          } else {
            output += JSON.stringify(key)
          }
          output += `: `
          output += recurseType(node.contents[key], `${indentation}  `)
        }
        output += `\n${indentation}}`
      }
      return output
    }
  }

  function recurseValue(node: Node, indentation: string): string {
    if (node.kind === `content`) {
      return node.packed.code.value
    } else {
      const asArray: Node[] = []
      while (Object.prototype.hasOwnProperty.call(node.contents, asArray.length)) {
        asArray.push(node.contents[asArray.length])
      }
      let output = ``
      let first = true
      if (asArray.length === Object.keys(node.contents).length) {
        output += `[`
        for (const child of asArray) {
          if (first) {
            first = false
          } else {
            output += `,`
          }
          output += `\n${indentation}  `
          output += recurseValue(child, `${indentation}  `)
        }
        output += `\n${indentation}]`
      } else {
        output += `{`
        for (const key in node.contents) {
          if (first) {
            first = false
          } else {
            output += `,`
          }
          output += `\n${indentation}  `
          if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
            output += key
          } else {
            output += JSON.stringify(key)
          }
          output += `: `
          output += recurseValue(node.contents[key], `${indentation}  `)
        }
        output += `\n${indentation}}`
      }
      return output
    }
  }

  await fsWriteFile(
    paths.typescriptContentFile(),
    `// This file was generated by a tool, and should not be directly modified.
${header}
const content: ${recurseType(root, ``)} = ${recurseValue(root, ``)}
`
  )
}
