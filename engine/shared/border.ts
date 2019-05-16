class Border {
  constructor(
    private readonly content: {
      readonly bottomLeft: Sprite
      readonly bottom: Sprite
      readonly bottomRight: Sprite
      readonly left: Sprite
      readonly middle: Sprite
      readonly right: Sprite
      readonly topLeft: Sprite
      readonly top: Sprite
      readonly topRight: Sprite
      readonly leftBorder: number
      readonly rightBorder: number
      readonly topBorder: number
      readonly bottomBorder: number
      readonly middleWidth: number
      readonly middleHeight: number
    }
  ) { }

  draw(width: number, height: number): void {
    this.content.topLeft.draw()
    transformGroup(() => {
      translateX(this.content.leftBorder)
      scaleX((width - this.content.leftBorder - this.content.rightBorder) / this.content.middleWidth)
      this.content.top.draw(true)
    })
    transformGroup(() => {
      translateX(width - this.content.rightBorder)
      this.content.topRight.draw()
    })
    transformGroup(() => {
      translateY(this.content.topBorder)
      scaleY((height - this.content.topBorder - this.content.bottomBorder) / this.content.middleHeight)
      this.content.left.draw(false, true)
      transformGroup(() => {
        translateX(this.content.leftBorder)
        scaleX((width - this.content.leftBorder - this.content.rightBorder) / this.content.middleWidth)
        this.content.middle.draw(true, true)
      })
      translateX(width - this.content.rightBorder)
      this.content.right.draw(false, true)
    })
    translateY(height - this.content.bottomBorder)
    this.content.bottomLeft.draw()
    transformGroup(() => {
      translateX(this.content.leftBorder)
      scaleX((width - this.content.leftBorder - this.content.rightBorder) / this.content.middleWidth)
      this.content.bottom.draw(true)
    })
    transformGroup(() => {
      translateX(width - this.content.rightBorder)
      this.content.bottomRight.draw()
    })
  }
}
