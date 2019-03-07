class GlBuffer {
  private contextId: null | number = null
  private buffer: null | WebGLBuffer = null

  constructor(
    private readonly target:
      | GlConstants.ARRAY_BUFFER
      | GlConstants.ELEMENT_ARRAY_BUFFER,
    private readonly usage:
      | GlConstants.STATIC_DRAW
      | GlConstants.DYNAMIC_DRAW
      | GlConstants.STREAM_DRAW,
    private readonly dataFactory: () => ArrayBufferView
  ) { }

  bind(gl: WebGLRenderingContext): void {
    if (this.contextId != contextId) {
      this.buffer = gl.createBuffer()
      gl.bindBuffer(this.target, this.buffer)
      gl.bufferData(this.target, this.dataFactory(), this.usage)
      this.contextId = contextId
    } else {
      gl.bindBuffer(this.target, this.buffer)
    }
  }
}
