import * as childProcess from "child_process"
import * as fs from "fs"
import * as util from "util"
import * as favicons from "favicons"
const isPng = require(`is-png`)
const pngcrushBin = require(`pngcrush-bin`)
const execBuffer = require(`exec-buffer`)
import * as htmlMinifier from "html-minifier"
import * as types from "./types"
import * as paths from "./paths"
import * as utilities from "./utilities"
import * as aseprite from "./aseprite"
import settings from "./settings"

const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)

export default async function (
  addedFiles: ReadonlyArray<string>,
  updatedFiles: ReadonlyArray<string>,
  deletedFiles: ReadonlyArray<string>,
  unmodifiedFiles: ReadonlyArray<string>
) {
  const modifiedFiles = addedFiles.concat(updatedFiles).concat(deletedFiles)
  const modifiedLocalizationMetadata = modifiedFiles
    .map(paths.analyzeLocalizationMetadata)
    .filter((metadata): metadata is types.MetadataContent => metadata !== null)
  const modifiedMetadataJson = modifiedFiles.find(paths.isMetadataJson)

  if (modifiedLocalizationMetadata.length || modifiedMetadataJson !== undefined) {
    console.log(`Metadata has changed; regenerating HTML...`)
    const unmodifiedLocalizationMetadata = unmodifiedFiles
      .map(paths.analyzeLocalizationMetadata)
      .filter((metadata): metadata is types.MetadataContent => metadata !== null)
    const allLocalizationMetadata = modifiedLocalizationMetadata
      .concat(unmodifiedLocalizationMetadata)
    const logos = allLocalizationMetadata.filter(metadata => metadata.name === `logo`)
    let logoPath: null | string = null
    if (!logos.length) {
      utilities.reportNonFatalError(`No logo found for this localization.`)
    } else if (logos.length > 1) {
      utilities.reportNonFatalError(`Multiple logos found for this localization.`)
    } else {
      switch (logos[0].extension) {
        case `ase`:
        case `aseprite`:
          const resolvedAsepritePath = await aseprite.pathToExecutable.get()
          const saveAs = logoPath = paths.tempFile(`logo.png`)
          await new Promise((resolve, reject) => childProcess
            .spawn(
              resolvedAsepritePath,
              [
                `--batch`, logos[0].source,
                `--save-as`, saveAs
              ]
            )
            .on(`exit`, status => {
              if (status === 0) {
                resolve()
              } else {
                reject(new Error(`Failed to invoke Aseprite to convert "${logos[0].source}".`))
              }
            })
          )
          break
        case `png`:
          logoPath = logos[0].source
          break
        default:
          utilities.reportNonFatalError(`Unsupported logo file extension "${logos[0].extension}".`)
      }
    }

    const htmlFragments: string[] = []

    let metadata: {
      readonly localizations: ReadonlyArray<{
        readonly localization: string
        readonly name: string
        readonly title: string
        readonly description: string
        readonly developer: {
          readonly name: string
          readonly url: string
        }
      }>
    } = {
      localizations: []
    }

    const metadataJsonFile = modifiedMetadataJson || unmodifiedFiles.find(paths.isMetadataJson)

    if (metadataJsonFile !== undefined) {
      metadata = JSON.parse(await fsReadFile(
        metadataJsonFile, { encoding: `utf8` }
      ))
    } else {
      utilities.reportNonFatalError(`No metadata.json file found.`)
    }

    let selectedLocalization: {
      readonly localization: string
      readonly name: string
      readonly title: string
      readonly description: string
      readonly developer: {
        readonly name: string
        readonly url: string
      }
    } = {
      localization: settings.localization,
      name: `This game is missing localization metadata for localization "${settings.localization}".`,
      title: `This game is missing localization metadata for localization "${settings.localization}".`,
      description: `This game is missing localization metadata for localization "${settings.localization}".`,
      developer: {
        name: `This game is missing localization metadata for localization "${settings.localization}".`,
        url: `about:blank`
      }
    }

    selectedLocalization = metadata.localizations
      .find(localization => localization.localization == settings.localization)
      || selectedLocalization

    if (logoPath !== null) {
      console.log(`Generating favicons...`)
      const response = await favicons(logoPath, {
        appName: selectedLocalization.title,
        appDescription: selectedLocalization.description,
        developerName: selectedLocalization.developer.name,
        developerURL: selectedLocalization.developer.url,
        background: `#000`,
        theme_color: `#000`,
        path: ``,
        display: `standalone`,
        orientation: `landscape`,
        start_url: ``,
        version: `1.0`,
        logging: false,
        icons: {
          android: !settings.development,
          appleIcon: !settings.development,
          appleStartup: !settings.development,
          coast: !settings.development,
          favicons: true,
          firefox: !settings.development,
          windows: !settings.development,
          yandex: !settings.development
        },
        pixel_art: true
      })

      response.html.forEach(fragment => htmlFragments.push(fragment))

      await utilities.asyncProgressBar(
        settings.development ? `Writing...` : `Compressing/writing...`,
        response.files.concat(response.images),
        true,
        async file => {
          if (!settings.development && isPng(file.contents)) {
            file.contents = await execBuffer({
              input: file.contents,
              bin: pngcrushBin,
              args: [`-brute`, `-force`, `-q`, `-reduce`, execBuffer.input, execBuffer.output]
            })
          }
          await fsWriteFile(paths.artifactsFile(file.name), file.contents)
        }
      )
    }

    let html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${selectedLocalization.title}</title>
        <meta name="viewport" content="initial-scale=1, minimum-scale=1, maximum-scale=1, width=device-width, height=device-height, user-scalable=no">
        ${htmlFragments.join(``)}
      </head>
      <body style="background: black; color: white;">
        <div id="message" style="position: fixed; font-family: sans-serif; font-size: 0.5cm; top: 50%; line-height: 0.5cm; transform: translateY(-50%); left: 0; right: 0; text-align: center;">Loading; please ensure that JavaScript is enabled.</div>
        <script src="index.js"></script>
      </body>
    </html>`

    if (!settings.development) {
      html = htmlMinifier.minify(html, {
        caseSensitive: false,
        collapseBooleanAttributes: true,
        collapseInlineTagWhitespace: true,
        collapseWhitespace: true,
        conservativeCollapse: false,
        customAttrAssign: [],
        customAttrSurround: [],
        customEventAttributes: [],
        decodeEntities: true,
        html5: true,
        ignoreCustomComments: [],
        ignoreCustomFragments: [],
        includeAutoGeneratedTags: false,
        keepClosingSlash: false,
        minifyCSS: {
          level: {
            2: {
              all: true
            }
          }
        } as any,
        minifyJS: false,
        minifyURLs: false,
        preserveLineBreaks: false,
        preventAttributesEscaping: false,
        processConditionalComments: false,
        processScripts: [],
        quoteCharacter: `"`,
        removeAttributeQuotes: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeEmptyElements: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        removeTagWhitespace: true,
        sortAttributes: true,
        sortClassName: true,
        trimCustomFragments: true,
        useShortDoctype: true
      })
    }

    await fsWriteFile(paths.artifactsFile(`index.html`), html)
  }
}
