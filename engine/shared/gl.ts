let gl: null | WebGLRenderingContext = null
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
    gl = canvas.getContext(`webgl`, attributes)
      || canvas.getContext(`experimental-webgl`, attributes)
    if (!gl) {
      throw new Error(`Failed to create a WebGL context.`)
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
