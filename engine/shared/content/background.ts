const backgroundVertexData = new Float32Array(16)
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
    private readonly width: number,
    private readonly height: number,
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

    backgroundVertexData[0] = transformedXMinX + transformedYMinX + currentTransform.x
    backgroundVertexData[1] = transformedXMinY + transformedYMinY + currentTransform.y
    backgroundVertexData[2] = this.uMin
    backgroundVertexData[3] = this.vMin
    backgroundVertexData[4] = transformedXMinX + transformedYMaxX + currentTransform.x
    backgroundVertexData[5] = transformedXMinY + transformedYMaxY + currentTransform.y
    backgroundVertexData[6] = this.uMin
    backgroundVertexData[7] = this.vMax
    backgroundVertexData[8] = transformedXMaxX + transformedYMaxX + currentTransform.x
    backgroundVertexData[9] = transformedXMaxY + transformedYMaxY + currentTransform.y
    backgroundVertexData[10] = this.uMax
    backgroundVertexData[11] = this.vMax
    backgroundVertexData[12] = transformedXMaxX + transformedYMinX + currentTransform.x
    backgroundVertexData[13] = transformedXMaxY + transformedYMinY + currentTransform.y
    backgroundVertexData[14] = this.uMax
    backgroundVertexData[15] = this.vMin

    basicProgram.bind()
    batchVertices.bind()
    gl.bufferSubData(GlConstants.ARRAY_BUFFER, 0, backgroundVertexData)
    basicProgram.attributes.aLocation(16, 0)
    basicProgram.attributes.aTextureCoordinate(16, 8)
    quadrilateralIndices.bind()
    basicProgram.uniforms.uTextureResolution(this.width + 2, this.height + 2)
    if (basicProgram.uniforms.uTexture(this.texture)) {
      gl.drawElements(GlConstants.TRIANGLES, 6, GlConstants.UNSIGNED_SHORT, 0)
    }
  }
}
