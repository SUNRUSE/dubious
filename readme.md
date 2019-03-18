# Dubious [![Travis](https://img.shields.io/travis/SUNRUSE/dubious.svg)](https://travis-ci.org/SUNRUSE/dubious) [![License](https://img.shields.io/github/license/SUNRUSE/dubious.svg)](https://github.com/SUNRUSE/dubious/blob/master/license) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FSUNRUSE%2Fdubious.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2FSUNRUSE%2Fdubious?ref=badge_shield) [![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)

A really very questionable web game engine.

- Automatic conversion of assets from "raw" formats to multiple target formats.
- Packing of assets for fast loading times (fewer HTTP requests).
- Division of content into runtime-critical and "able-to-fail".
- Code generation from content for compile-time-safe content.
- Persistent caching of build results for fast re-builds.
- Localization-specific substitution of content.
- "Hot reload" for fast iteration.

## Usage

### Development

#### Requirements

- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js](https://nodejs.org/en/)

#### Optional

- [Aseprite](https://www.aseprite.org/)

#### Instructions

- Clone this repository.

  This should only need to be done once.

  You can do this by opening Visual Studio Code, pressing F1, then entering
  `clone` and pressing enter to select `Git: Clone`.

  You will then be prompted for the URL of the repository, then, a place to
  clone it into.  Once it is done, a blue `Open Repository` button will appear
  in the bottom right.  Click on it.

- Press Ctrl+Shift+B and you should see a command-line application start in the
  terminal at the bottom of Visual Studio Code.  Use the arrow keys to navigate
  this application.

- The selected game should now be testable in your browser at
  `http://localhost:5000` unless you selected another port or a non-development
  build.

- Any changes you make, to code or content, will automatically be reflected
  there if a development build was selected.

See `File structure` for details on adding new or modifying existing games.

### Build server

Build scripts are included for Travis CI and AWS CodeBuild.  These will perform
a production build for all localizations of all games, but do nothing else.  To
deploy the created artifacts, please amend these scripts in your forks.

When using AWS CodeBuild, using S3 build cache is recommended.

Only Ubuntu hosts are supported.  Aseprite will be built automatically from
source at the last version to be open source (v1.1.7).

#### Requirements

- [Node.js](https://nodejs.org/en/)

## File structure

### Source controlled

#### `games/{game}/index.ts`

The "root" of game code; use `/// <reference path="{file}" />` to include other
files.

#### `games/{game}/metadata.json`

Describes the game as would be shown in a library of games.  For example:

```json
{
  "title": "The title of the game.",
  "description": "A short description of the game.",
  "developer": {
    "name": "The name of the developer of the game.",
    "url": "https://the-url-of-the-developer.com/which-can/include-paths"
  },
  "localizations": [{
    "localization": "The internal name of the localization, i.e. en-us",
    "name": "The name of the localization, i.e. English (US).",
    "title": "The localized title of the game.",
    "description": "A localized, short description of the game.",
    "developer": {
      "name": "The localized name of the developer of the game.",
      "url": "https://the-localized-url-of-the-developer.com/which-can/include-paths"
    }
  }]
}
```

#### `games/{game}/logo.{png ase aseprite}`

Used as the favicon and launcher image for the localization selection menu.
Additionally shown as an icon when pinned to the home screen.  Expected to be
square.

#### `games/{game}/localizations/{localization}/logo.{png ase aseprite}`

Used as the favicon and launcher image for a specific localization.
Additionally shown as an icon when pinned to the home screen.  Expected to be
square.

#### `games/{game}/localizations/{localization}/flag.{png ase aseprite}`

Shown on the localization selection menu to identity a localization.  Expected
to be square.

#### `games/{game}/{**/name}.{purpose}.{extension}`

Content to be included.  The path is used to build a tree (the `content`
object).

- `kebab-case` is automatically converted to `camelCase` (in directory/file
  names only).

- Directories are converted into objects.

- Some file types can include multiple pieces of content inside them.  In this
  case, the file is treated as a directory and the contained content is treated
  as paths to files within that directory.

- Directories containing directories and/or files which are sequential numbers
  will be turned into arrays.

- As a special case, repeated slashes will be preserved as fonts often need to
  create content which is named in a way which could be confused for a directory
  separator.

For example:

- `as-array/0.png`
- `as-array/1.png`
- `as-array/2.png`
- `as-array/3.png`
- `top-level/mid-level/bottom-level.ase`
  - `subPathA/subPathB/subPathC` (frame tag)
  - `subPathA/subPathB/subPathD` (frame tag)
  - `subPathA/subPathE` (frame tag)
  - `preservedSlashesInMiddle///withContent` (frame tag)
  - `preservedSlashesInMiddle/\/withContent` (frame tag)
  - `preservedSlashesInMiddle////withContent` (frame tag)
  - `preservedSlashesInMiddle/\\/withContent` (frame tag)
  - `preservedSlashesAtEnd/` (frame tag)
  - `preservedSlashesAtEnd\` (frame tag)
  - `preservedSlashesAtEnd//` (frame tag)
  - `preservedSlashesAtEnd\\` (frame tag)

Would produce:

```typescript
const content = {
  asArray: [sprite, sprite, sprite, sprite],
  topLevel: {
    midLevel: {
      bottomLevel: {
        subPathA: {
          subPathB: {
            subPathC: sprite,
            subPathD: sprite
          },
          subPathE: sprite
        },
        preservedSlashesInMiddle: {
          "/": {
            withContent: sprite
          },
          "\\": {
            withContent: sprite
          },
          "//": {
            withContent: sprite
          },
          "\\\\": {
            withContent: sprite
          }
        },
        preservedSlashesAtEnd: {
          "/": sprite,
          "\\": sprite,
          "//": sprite,
          "\\\\": sprite
        }
      }
    }
  }
}
```

See `Content purposes` for details on what is done with specific file types.

#### `games/{game}/{name}.{localization}.{purpose}.{extension}`

Equivalent to `games/{game}/{name}.{purpose}.{extension}`, but only loaded when
building the indicated localization.

### Generated

#### `games/{game}/tsconfig.json`, `games/{game}/index.generated.ts`, `games/{game}/content.generated.ts`

Temporary files which are used to connect the Typescript compiler to the
appropriate game and engine implementation and add the imported content to the
global scope.  These are where they are to make Visual Studio Code's
Intellisense function; in theory, they should be in the `ephemeral` directory.

#### `ephemeral/environments/{environment}/artifacts/{game}/{localization}`

The files which should be hosted on a HTTP/S server to distribute the game.

#### `ephemeral/environments/production/artifacts/{game}.zip`

Zip archives of the above artifacts; the contents are the localization
directories.

#### `ephemeral/environments/{environment}/temp`

Contains temporary resources created and used while building.  It can be safely
deleted while the build pipeline is not running, though this will make the next
build considerably longer.

### Non-game

#### `engine`

Contains shared game engine code.

#### `pipeline`

Contains the scripts which perform a build.

## Content purposes

Content is imported differently depending upon its "purpose", which is
indicated in its file name as specified in `File structure`.

Some content is loaded at startup (the game will not start until it has been
loaded) while others are loaded on-demand.

Some content is considered runtime-critical, and the game cannot continue
without it.  Others may be retried, but the game will continue regardless of
whether they have been loaded; any attempts to use them will do nothing.

Some content will be automatically released when it is not referenced.  Others
will be kept in-memory for as long as the game runs.

Some content is packed into a single file, and therefore, when any piece of that
content is loaded, all are loaded.

| Purpose      | At startup | Can fail | Releasable | One file | Supported extensions   |
|--------------|------------|----------|------------|----------|------------------------|
| `data`       | ✔️         | ❌        | ❌          | ✔️       | `json`                 |
| `sprite`     | ✔️         | ❌        | ❌          | ✔️       | `png` `ase` `aseprite` |
| `background` | ❌          | ✔️       | ✔️         | ❌        | `png` `ase` `aseprite` |
| `sound`      | ❌          | ✔️       | ❌          | ✔️       | `wav` `flac`           |
| `song`       | ❌          | ✔️       | ✔️         | ❌        | `wav` `flac`           |

### `data`

Information which is included in the content tree.  This is broken down into
subpaths, so it can share objects with content from other files.

Precise functionality varies by file type.

#### `json`

JSON files are parsed and included as-is.

### `sprite`

Small, gameplay-critical images.  These are packed into an atlas of up to
4096x4096 pixels.

Empty space is automatically trimmed.

Duplicate frames are eliminated.

The center of the untrimmed source image is used as the origin.

#### Aseprite

If an `ase` or `aseprite` file contains frame tags, their contained frames are
imported as arrays of sprites, under subpaths named the same as the frame tags.

### `background`

Large, decorative images which do not affect gameplay.

Empty space is automatically trimmed.

Duplicate frames from the same file are eliminated.

The center of the untrimmed source image is used as the origin.

Use `isLoaded()` to ensure that every frame of an animation is loaded before
attempting to display any part of it.

#### Aseprite

If an `ase` or `aseprite` file contains frame tags, their contained frames are
imported as arrays of backgrounds, under subpaths named the same as the frame
tags.

### `sound`

Short, "fire-and-forget" samples of sound.  They are packed into a single file
which is loaded as soon as possible (following user interaction).

Leading and trailing silence is automatically trimmed.

### `song`

A single looping song can be playing at a time.  Leading and trailing silence
are trimmed.

## Runtime engine

```
    initial()   video
        ¦         ^
        v         ¦
 .--> state -> render() <- content
¦       ¦         ¦
¦       v         v
 '- elapsed()   audio
        ^
        ¦
      input
```

### To be declared by the game

#### Types

##### `State`

To allow for "hot reload", all game state must be encapsulated in an object
which is JSON-serializable.  This is called `state`, and its type must be
declared with a name of `State`.

Note that no type checks will be performed; if the contents of `State` change
between hot reloads, it is possible that the Typescript constraints will no
longer align with the restored state, in which case it will need to be flushed.

#### Functions

| Function       | Mutate state | Input | Video | Audio      | Save/load |
|----------------|--------------|-------|-------|------------|-----------|
| `initialState` | (returned)   | ❌     | ❌     | ❌          | ❌         |
| `elapsed`      | ✔️           | ✔️    | ❌     | ✔️         | ✔️        |
| `render`       | ❌            | ❌     | ✔️    | ❌          | ❌         |
| `currentSong`  | ❌            | ❌     | ❌     | (returned) | ❌         |

##### `initial`

Returns the `State` to use if there is not one available already.

##### `elapsed`

Mutates the given `State` to take the given number of elapsed seconds into
account.

##### `localStoragePrefix`

A constant string prefixed onto any local storage saves/loads.

##### `targetWidth`, `targetHeight`

The dimensions of the "virtual display".  Note that this only defines the "safe
area", and if the user's display is wider or taller than this aspect ratio,
extra content may be shown at the top/bottom or left/right sides.

| Symbol | Meaning                                                                |
|--------|------------------------------------------------------------------------|
| `█`    | Safe zone (always visible)                                             |
| `░`    | Margin (only visible when target and actual aspect ratio do not match) |
| `0`    | X 0, Y 0                                                               |
| `X+`   | X `targetWidth`, Y 0                                                   |
| `Y+`   | X 0, Y `targetHeight`                                                  |

Where the display is a perfect match for the specified aspect ratio:

```
O███████████X+
██████████████
██████████████
Y+████████████
```

Where the display is wider than the specified aspect ratio:

```
░░░O███████████X+░░░
░░░██████████████░░░
░░░██████████████░░░
░░░Y+████████████░░░
```

Where the display is taller than the specified aspect ratio:

```
░░░░░░░░░░░░░░
O███████████X+
██████████████
██████████████
Y+████████████
░░░░░░░░░░░░░░
```

##### `render`

Produces video/audio for the given `State`.

##### `currentSong`

Selects a piece of content to play as a looping music track for the given
`State`, or `null` if none should be played.

### Declared by the engine

#### `content`

An object which describes all of the available content; see `File structure` for
details on its contents.

#### Input

##### `held`

Returns `true` when the given input is held down, otherwise, `false`.

#### Video

##### `xMargin`

The number of virtual pixels in the left/right margins.

##### `yMargin`

The number of virtual pixels in the top/bottom margins.

##### `draw`

Draws the specified piece of content at the specified location in virtual
pixels.

#### Audio

##### `play`

Plays the specified piece of content.

#### Save/Load

Local storage is used for save/load.

The following keys/values will be created:

- `{localStoragePrefix}-quicksave`
- `{localStoragePrefix}-settings`
- `{localStoragePrefix}-game-{name}`

##### `save`

Saves the given JSON as the given name.

##### `load`

Loads JSON from the given name.  Returns `null` if there is nothing saved with
the given name.

Note that no type checks will be performed on the returned data.

## Differences between development and production builds

In development builds, errors are logged to the console but the game does not
stop.  In production builds, the game stops with text describing the error.

In development builds, the game does not pause when focus is lost.  This is so
that development tools can have focus without the game pausing.  In production
builds, the game will pause and may release resources so that mobile devices do
not kill the tab.

In production builds, WebGL shaders are disposed of as soon as possible.  This
causes stability problems in a number of WebGL debugging tools, so they are kept
attached in development builds.

More time is spent packing assets in production builds to reduce artifact size
as much as possible.  Development builds, on the other hand, optimize for build
performance.  For example, duplicate sprite frames are eliminated, PNGs are
heavily compressed and JavaScript, HTML and CSS are minified.

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FSUNRUSE%2Fdubious.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FSUNRUSE%2Fdubious?ref=badge_large)
