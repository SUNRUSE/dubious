type RenderTargetContents = {
  contextId: number
  width: number
  height: number
  texture: null | WebGLTexture
  framebuffer: null | WebGLFramebuffer
}

let populatingRenderTarget: null | RenderTarget = null

class RenderTarget extends FrameCache<RenderTargetContents> implements GlTexture {
  constructor(
    private readonly width: () => number,
    private readonly height: () => number,
    private readonly target: GlTextureTarget,
    private readonly format: GlTextureFormat,
    private readonly type: GlTextureType,
    private readonly textureWrapS: GlTextureWrap,
    private readonly textureWrapT: GlTextureWrap,
    private readonly minFilter: GlTextureMinFilter,
    private readonly magFilter: GlTextureMagFilter
  ) {
    super()
  }

  create(): RenderTargetContents {
    const width = this.width()
    const height = this.height()

    const texture = gl.createTexture()
    gl.bindTexture(this.target, texture)
    gl.texImage2D(this.target, 0, this.format, width, height, 0, this.format, this.type, null)
    gl.texParameteri(this.target, GlConstants.TEXTURE_WRAP_S, this.textureWrapS)
    gl.texParameteri(this.target, GlConstants.TEXTURE_WRAP_T, this.textureWrapT)
    gl.texParameteri(this.target, GlConstants.TEXTURE_MIN_FILTER, this.minFilter)
    gl.texParameteri(this.target, GlConstants.TEXTURE_MAG_FILTER, this.magFilter)

    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(GlConstants.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(GlConstants.FRAMEBUFFER, GlConstants.COLOR_ATTACHMENT0, this.target, texture, 0)

    return {
      contextId,
      width,
      height,
      texture,
      framebuffer
    }
  }

  update(cached: RenderTargetContents): void {
  }

  dispose(cached: RenderTargetContents): void {
    if (contextId === cached.contextId) {
      gl.deleteFramebuffer(cached.framebuffer)
      gl.deleteTexture(cached.texture)
    }
  }

  populate(content: () => void): void {
    if (populatingRenderTarget !== null) {
      throw new Error(`Cannot nest RenderTarget draw calls`)
    }

    populatingRenderTarget = this
    let contents = this.getOrCreate()
    if (contents.width !== this.width() || contents.height !== this.height()) {
      this.forcePurge()
      contents = this.getOrCreate()
    }

    gl.bindFramebuffer(GlConstants.FRAMEBUFFER, contents.framebuffer)
    content()
    gl.bindFramebuffer(GlConstants.FRAMEBUFFER, null)
    populatingRenderTarget = null
  }

  bind(): boolean {
    const contents = this.get()

    if (contents === undefined) {
      return false
    } else {
      gl.bindTexture(this.target, contents.texture)
      return true
    }
  }
}
