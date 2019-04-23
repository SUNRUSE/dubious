let gl: WebGLRenderingContext
let contextLost = false
let contextId = 0

function getGl(): WebGLRenderingContext {
  if (!gl) {
    const canvas = getCanvas()
    const attributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      failIfMajorPerformanceCaveat: true,
      powerPreference: `low-power`,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false
    }
    const possibleGl = canvas.getContext(`webgl`, attributes)
      || canvas.getContext(`experimental-webgl`, attributes)
    if (!possibleGl) {
      throw new Error(`Failed to create a WebGL context.`)
    }
    gl = possibleGl
    if (gl.getExtension(`OES_standard_derivatives`) === null) {
      throw new Error(`This implementation of WebGL does not support the standard derivatives extension.`)
    }
    canvas.addEventListener(`webglcontextlost`, event => {
      contextLost = true
      checkEventLoop()
      event.preventDefault()
    }, false)
    canvas.addEventListener(`webglcontextrestored`, event => {
      contextLost = false
      contextId++
      activeAttributeIndices = null
      checkEventLoop()
      event.preventDefault()
    })
  }

  return gl
}
