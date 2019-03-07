class GlTexture {
  private contextId: null | number = null
  private texture: null | WebGLTexture = null

  constructor(
    private readonly target:
      | GlConstants.TEXTURE_2D
      | GlConstants.TEXTURE_CUBE_MAP_POSITIVE_X
      | GlConstants.TEXTURE_CUBE_MAP_NEGATIVE_X
      | GlConstants.TEXTURE_CUBE_MAP_POSITIVE_Y
      | GlConstants.TEXTURE_CUBE_MAP_NEGATIVE_Y
      | GlConstants.TEXTURE_CUBE_MAP_POSITIVE_Z
      | GlConstants.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    private readonly format:
      | GlConstants.ALPHA
      | GlConstants.RGB
      | GlConstants.RGBA
      | GlConstants.LUMINANCE
      | GlConstants.LUMINANCE_ALPHA,
    private readonly type:
      | GlConstants.UNSIGNED_BYTE
      | GlConstants.UNSIGNED_SHORT_5_6_5
      | GlConstants.UNSIGNED_SHORT_4_4_4_4
      | GlConstants.UNSIGNED_SHORT_5_5_5_1,
    private readonly width: number,
    private readonly height: number,
    private readonly pixelsFactory: () => ArrayBufferView
  ) { }

  bind(gl: WebGLRenderingContext): void {
    if (this.contextId != contextId) {
      this.texture = gl.createTexture()
      gl.bindTexture(this.target, this.texture)
      gl.texImage2D(this.target, 0, this.format, this.width, this.height, 0, this.format, this.type, this.pixelsFactory())
      this.contextId = contextId
    } else {
      gl.bindTexture(this.target, this.texture)
    }
  }
}
