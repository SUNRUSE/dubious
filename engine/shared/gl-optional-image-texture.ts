class GlOptionalImageTexture {
  private contextId: null | number = null
  private texture: null | WebGLTexture = null
  private htmlImageElement: null | HTMLImageElement = null
  private ready = false

  constructor(
    private readonly path: string,
    private readonly target: GlTextureTarget,
    private readonly format: GlTextureFormat,
    private readonly type: GlTextureType,
    private readonly textureWrapS: GlTextureWrap,
    private readonly textureWrapT: GlTextureWrap,
    private readonly minFilter: GlTextureMinFilter,
    private readonly magFilter: GlTextureMagFilter,
    private readonly generateMipmap: boolean
  ) {
  }

  unload(): void {
    this.htmlImageElement = null
    this.ready = false
    if (this.contextId === contextId) {
      gl.deleteTexture(this.texture)
      this.contextId = null
    }
  }

  bind(): boolean {
    if (this.htmlImageElement === null) {
      const htmlImageElement = this.htmlImageElement = document.createElement(`img`)
      htmlImageElement.onload = () => {
        if (this.htmlImageElement === htmlImageElement) {
          this.ready = true
        }
      }
      this.htmlImageElement.src = this.path
    }

    if (this.ready) {
      if (this.contextId !== contextId) {
        this.texture = gl.createTexture()
        gl.bindTexture(this.target, this.texture)
        gl.texImage2D(this.target, 0, this.format, this.format, this.type, this.htmlImageElement)
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

    return false
  }
}

class GlFrameCachedOptionalImageTexture extends FrameCache<GlOptionalImageTexture> {
  constructor(
    private readonly path: string,
    private readonly target: GlTextureTarget,
    private readonly format: GlTextureFormat,
    private readonly type: GlTextureType,
    private readonly textureWrapS: GlTextureWrap,
    private readonly textureWrapT: GlTextureWrap,
    private readonly minFilter: GlTextureMinFilter,
    private readonly magFilter: GlTextureMagFilter,
    private readonly generateMipmap: boolean
  ) {
    super()
  }

  create(): GlOptionalImageTexture {
    return new GlOptionalImageTexture(
      this.path,
      this.target,
      this.format,
      this.type,
      this.textureWrapS,
      this.textureWrapT,
      this.minFilter,
      this.magFilter,
      this.generateMipmap
    )
  }

  update(cached: GlOptionalImageTexture): void { }

  dispose(cached: GlOptionalImageTexture): void {
    cached.unload()
  }

  bind(): boolean {
    return this.getOrCreate().bind()
  }
}
