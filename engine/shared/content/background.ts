const backgroundTextures: GlFrameCachedOptionalImageTexture[] = []

class Background {
  private readonly texture: GlFrameCachedOptionalImageTexture
  private readonly xMin: number
  private readonly yMin: number
  private readonly uMin: number
  private readonly vMin: number
  private readonly xMax: number
  private readonly yMax: number
  private readonly uMax: number
  private readonly vMax: number

  constructor(
    id: number,
    width: number,
    height: number,
    offsetLeft: number,
    offsetTop: number
  ) {
    if (!backgroundTextures[id]) {
      backgroundTextures[id] = new GlFrameCachedOptionalImageTexture(
        `background-${id}.png`,
        GlConstants.TEXTURE_2D,
        GlConstants.RGBA,
        GlConstants.UNSIGNED_BYTE,
        GlConstants.CLAMP_TO_EDGE,
        GlConstants.CLAMP_TO_EDGE,
        GlConstants.NEAREST,
        GlConstants.NEAREST,
        false
      )
    }
    this.texture = backgroundTextures[id]

    this.xMin = offsetLeft - 0.5
    this.yMin = offsetTop - 0.5
    this.uMin = 0.5 / (width + 2)
    this.vMin = 0.5 / (height + 2)
    this.xMax = offsetLeft + width + 0.5
    this.yMax = offsetTop + height + 0.5
    this.uMax = (width - 0.5) / (width + 2)
    this.vMax = (height - 0.5) / (height + 2)
  }

  draw(): void {
    const transformedXMinX = this.xMin * currentTransform.xx
    const transformedXMinY = this.xMin * currentTransform.xy
    const transformedXMaxX = this.xMax * currentTransform.xx
    const transformedXMaxY = this.xMax * currentTransform.xy
    const transformedYMinX = this.yMin * currentTransform.yx
    const transformedYMinY = this.yMin * currentTransform.yy
    const transformedYMaxX = this.yMax * currentTransform.yx
    const transformedYMaxY = this.yMax * currentTransform.yy
    drawBatch(
      this.texture,
      transformedXMinX + transformedYMinX + currentTransform.x,
      transformedXMinY + transformedYMinY + currentTransform.y,
      this.uMin, this.vMin,
      transformedXMinX + transformedYMaxX + currentTransform.x,
      transformedXMinY + transformedYMaxY + currentTransform.y,
      this.uMin, this.vMax,
      transformedXMaxX + transformedYMaxX + currentTransform.x,
      transformedXMaxY + transformedYMaxY + currentTransform.y,
      this.uMax, this.vMax,
      transformedXMaxX + transformedYMinX + currentTransform.x,
      transformedXMaxY + transformedYMinY + currentTransform.y,
      this.uMax, this.vMin
    )
  }
}
