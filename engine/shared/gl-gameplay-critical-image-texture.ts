class GlGameplayCriticalImageTexture {
  private contextId: null | number = null
  private texture: null | WebGLTexture = null
  private readonly htmlImageElement: HTMLImageElement

  constructor(
    path: string,
    private readonly target: GlTextureTarget,
    private readonly format: GlTextureFormat,
    private readonly type: GlTextureType,
    private readonly textureWrapS: GlTextureWrap,
    private readonly textureWrapT: GlTextureWrap,
    private readonly minFilter: GlTextureMinFilter,
    private readonly magFilter: GlTextureMagFilter,
    private readonly generateMipmap: boolean
  ) {
    this.htmlImageElement = document.createElement(`img`)
    this.htmlImageElement.src = path

    this.htmlImageElement.onload = () => {
      loadedGameplayCriticalContent++
      checkEventLoop()
    }

    this.htmlImageElement.onerror = () => {
      throw new Error(`Failed to load a gameplay-critical image texture.`)
    }

    totalGameplayCriticalContent++
  }

  bind(): boolean {
    if (this.contextId !== contextId) {
      this.texture = gl.createTexture()
      gl.bindTexture(this.target, this.texture)
      gl.texImage2D(this.target, 0, this.format, this.format, this.type, this.htmlImageElement)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.textureWrapS)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.textureWrapT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter)
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
