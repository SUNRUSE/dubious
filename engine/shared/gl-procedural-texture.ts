class GlProceduralTexture implements GlTexture {
  private contextId: null | number = null
  private texture: null | WebGLTexture = null

  constructor(
    private readonly target: GlTextureTarget,
    private readonly format: GlTextureFormat,
    private readonly type: GlTextureType,
    private readonly textureWrapS: GlTextureWrap,
    private readonly textureWrapT: GlTextureWrap,
    private readonly minFilter: GlTextureMinFilter,
    private readonly magFilter: GlTextureMagFilter,
    private readonly generateMipmap: boolean,
    private readonly width: number,
    private readonly height: number,
    private readonly pixelsFactory: () => ArrayBufferView
  ) { }

  bind(): boolean {
    if (this.contextId !== contextId) {
      this.texture = gl.createTexture()
      gl.bindTexture(this.target, this.texture)
      gl.texImage2D(this.target, 0, this.format, this.width, this.height, 0, this.format, this.type, this.pixelsFactory())
      gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, this.textureWrapS)
      gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, this.textureWrapT)
      gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, this.minFilter)
      gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, this.magFilter)
      if (this.generateMipmap) {
        gl.generateMipmap(this.target)
      }
      this.contextId = contextId
    } else {
      gl.bindTexture(this.target, this.texture)
    }
    return true
  }
}
