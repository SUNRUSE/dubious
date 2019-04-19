const atlasTexture = new GlGameplayCriticalImageTexture(
  `atlas.png`,
  GlConstants.TEXTURE_2D,
  GlConstants.RGBA,
  GlConstants.UNSIGNED_BYTE,
  GlConstants.CLAMP_TO_EDGE,
  GlConstants.CLAMP_TO_EDGE,
  GlConstants.NEAREST,
  GlConstants.NEAREST,
  false
)

class Sprite {
  private readonly xMin: number
  private readonly yMin: number
  private readonly uMin: number
  private readonly vMin: number
  private readonly xMax: number
  private readonly yMax: number
  private readonly uMax: number
  private readonly vMax: number

  constructor(
    atlasLeft: number,
    atlasTop: number,
    width: number,
    height: number,
    offsetLeft: number,
    offsetTop: number
  ) {
    this.xMin = offsetLeft - 0.5
    this.yMin = offsetTop - 0.5
    this.uMin = (atlasLeft - 0.5) / atlasWidth
    this.vMin = (atlasTop - 0.5) / atlasHeight
    this.xMax = offsetLeft + width + 0.5
    this.yMax = offsetTop + height + 0.5
    this.uMax = (atlasLeft + width + 0.5) / atlasWidth
    this.vMax = (atlasTop + height + 0.5) / atlasHeight
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
      atlasTexture,
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
