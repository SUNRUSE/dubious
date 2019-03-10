class GlProceduralTexture {
  private contextId: null | number = null
  private texture: null | WebGLTexture = null

  constructor(
    private readonly target: GlTextureTarget,
    private readonly format: GlTextureFormat,
    private readonly type: GlTextureType,
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
