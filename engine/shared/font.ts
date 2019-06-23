const enum HorizontalAlignment {
  Left,
  Middle,
  Right
}

const enum VerticalAlignment {
  Top,
  Middle,
  Bottom
}

class Font {
  constructor(
    private readonly content: {
      readonly layout: {
        readonly lineSpacing: number
        readonly capHeight: number
        readonly kerning: number
        readonly defaultCharacterWidth: number
        readonly characterWidthOverrides: { readonly [character: string]: number }
      }
      readonly sprites: { readonly [character: string]: Sprite }
    }
  ) { }

  write(text: string, horizontalAlignment: HorizontalAlignment, verticalAlignment: VerticalAlignment): void {
    transformGroup(() => {
      const lines = text.split(`\n`)
      switch (verticalAlignment) {
        case VerticalAlignment.Middle:
          translateY(this.height(text) / -2)
          break
        case VerticalAlignment.Bottom:
          translateY(-this.height(text))
          break
      }
      for (const line of lines) {
        transformGroup(() => {
          switch (horizontalAlignment) {
            case HorizontalAlignment.Middle:
              translateX(this.lineWidth(line) / -2)
              break
            case HorizontalAlignment.Right:
              translateX(-this.lineWidth(line))
              break
          }
          for (const character of line) {
            if (Object.prototype.hasOwnProperty.call(this.content.sprites, character)) {
              this.content.sprites[character].draw()
            }

            translateX(this.characterWidth(character) + this.content.layout.kerning)
          }
        })
        translateY(this.content.layout.capHeight + this.content.layout.lineSpacing)
      }
    })
  }

  width(text: string): number {
    return Math.max.apply(Math, text.split(`\n`).map(line => this.lineWidth(line)))
  }

  height(text: string): number {
    return text.split(`\n`).length * (this.content.layout.capHeight + this.content.layout.lineSpacing) - this.content.layout.lineSpacing
  }

  wrap(text: string, width: number): string {
    let lineWidth = 0
    let wordWidth = 0
    let word = ``
    let output = ``
    for (const character of text) {
      if (character == `\n`) {
        lineWidth = 0
        wordWidth = 0
        output += word
        output += `\n`
        word = ``
      } else {
        let characterWidth = this.characterWidth(character)
        if (Object.prototype.hasOwnProperty.call(this.content.sprites, character)) {
          if (lineWidth + wordWidth + characterWidth > width) {
            if (word || lineWidth) {
              if (lineWidth && wordWidth + characterWidth < width) {
                output += `\n`
                word += character
                wordWidth += characterWidth + this.content.layout.kerning
              } else {
                output += word
                output += `\n`
                if (character != `-`) output += `-`
                word = character
                let dashWidth = this.characterWidth(`-`)
                wordWidth = characterWidth + dashWidth + this.content.layout.kerning
              }
            } else {
              output += character
              output += `\n`
            }
            lineWidth = 0
          } else {
            if ([`-`, `+`, `=`, `;`, `:`, `@`, `#`, `~`, `,`, `.`].includes(character)) {
              output += word
              output += character
              lineWidth += wordWidth + characterWidth + this.content.layout.kerning
              word = ``
              wordWidth = 0
            } else {
              wordWidth += characterWidth + this.content.layout.kerning
              word += character
            }
          }
        } else {
          if (word) {
            lineWidth += wordWidth
            output += word
            word = ``
            wordWidth = 0
          }
          if (lineWidth + characterWidth > width) {
            output += `\n`
            lineWidth = 0
          } else {
            output += character
            lineWidth += characterWidth + this.content.layout.kerning
          }
        }
      }
    }
    if (word) output += word
    return output
  }

  private lineWidth(line: string): number {
    let width = 0
    for (const character of line) {
      width += this.characterWidth(character) + this.content.layout.kerning
    }
    if (line.length) {
      width -= this.content.layout.kerning
    }
    return width
  }

  private characterWidth(character: string): number {
    if (Object.prototype.hasOwnProperty.call(this.content.layout.characterWidthOverrides, character)) {
      return this.content.layout.characterWidthOverrides[character]
    } else {
      return this.content.layout.defaultCharacterWidth
    }
  }
}
