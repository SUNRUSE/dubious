class Sprite {
  private readonly xMin: number
  private readonly yMin: number
  private readonly uMin: number
  private readonly vMin: number
  private readonly xMax: number
  private readonly yMax: number
  private readonly uMax: number
  private readonly vMax: number

  private readonly xMinExpanded: number
  private readonly yMinExpanded: number
  private readonly uMinExpanded: number
  private readonly vMinExpanded: number
  private readonly xMaxExpanded: number
  private readonly yMaxExpanded: number
  private readonly uMaxExpanded: number
  private readonly vMaxExpanded: number

  constructor(
    atlasLeft: number,
    atlasTop: number,
    width: number,
    height: number,
    offsetLeft: number,
    offsetTop: number
  ) {
    this.xMin = offsetLeft
    this.yMin = offsetTop
    this.uMin = atlasLeft / atlasWidth
    this.vMin = atlasTop / atlasHeight
    this.xMax = offsetLeft + width
    this.yMax = offsetTop + height
    this.uMax = (atlasLeft + width) / atlasWidth
    this.vMax = (atlasTop + height) / atlasHeight
    this.xMinExpanded = offsetLeft - 0.5
    this.yMinExpanded = offsetTop - 0.5
    this.uMinExpanded = (atlasLeft - 0.5) / atlasWidth
    this.vMinExpanded = (atlasTop - 0.5) / atlasHeight
    this.xMaxExpanded = offsetLeft + width + 0.5
    this.yMaxExpanded = offsetTop + height + 0.5
    this.uMaxExpanded = (atlasLeft + width + 0.5) / atlasWidth
    this.vMaxExpanded = (atlasTop + height + 0.5) / atlasHeight
  }

  draw(
    cropX?: boolean,
    cropY?: boolean
  ): void {
    const xMin = cropX ? this.xMin : this.xMinExpanded
    const uMin = cropX ? this.uMin : this.uMinExpanded
    const xMax = cropX ? this.xMax : this.xMaxExpanded
    const uMax = cropX ? this.uMax : this.uMaxExpanded
    const yMin = cropY ? this.yMin : this.yMinExpanded
    const vMin = cropY ? this.vMin : this.vMinExpanded
    const yMax = cropY ? this.yMax : this.yMaxExpanded
    const vMax = cropY ? this.vMax : this.vMaxExpanded
    const transformedXMinX = xMin * currentTransform.xx
    const transformedXMinY = xMin * currentTransform.xy
    const transformedXMaxX = xMax * currentTransform.xx
    const transformedXMaxY = xMax * currentTransform.xy
    const transformedYMinX = yMin * currentTransform.yx
    const transformedYMinY = yMin * currentTransform.yy
    const transformedYMaxX = yMax * currentTransform.yx
    const transformedYMaxY = yMax * currentTransform.yy
    drawBatch(
      transformedXMinX + transformedYMinX + currentTransform.x,
      transformedXMinY + transformedYMinY + currentTransform.y,
      uMin, vMin,
      transformedXMinX + transformedYMaxX + currentTransform.x,
      transformedXMinY + transformedYMaxY + currentTransform.y,
      uMin, vMax,
      transformedXMaxX + transformedYMaxX + currentTransform.x,
      transformedXMaxY + transformedYMaxY + currentTransform.y,
      uMax, vMax,
      transformedXMaxX + transformedYMinX + currentTransform.x,
      transformedXMaxY + transformedYMinY + currentTransform.y,
      uMax, vMin
    )
  }
}
