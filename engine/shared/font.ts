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
