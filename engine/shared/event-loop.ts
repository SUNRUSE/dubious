let animationFrame: null | number = null
let previousTime: null | number = null

let state: State

function checkEventLoop(): void {
  if (errorOccurred) {
    pause()
    return
  }

  const loadingMessage = generateLoadingMessage()
  if (loadingMessage !== null) {
    pause()
    showMessage(loadingMessage)
    return
  }

  const focused = development || document.hasFocus()

  if (focused && !contextLost) {
    hideMessage()
    showCanvas()
    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(onFrame)
    }
    return
  }

  pause()
  if (!focused) {
    showMessage(`(paused)`)
  } else {
    showMessage(`Waiting for WebGL restart...`)
  }

  function pause(): void {
    previousTime = null
    hideCanvas()
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
}

function onFrame(time: number): void {
  animationFrame = null

  if (previousTime !== null) {
    elapsed(state, Math.max(0, Math.min(0.1, (time - previousTime) / 1000)))
  }
  previousTime = time

  const gl = getGl()
  gl.canvas.width = gl.canvas.clientWidth
  gl.canvas.height = gl.canvas.clientHeight
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(GlConstants.COLOR_BUFFER_BIT)
  gl.enable(GlConstants.CULL_FACE)
  gl.enable(GlConstants.BLEND)
  gl.blendFunc(GlConstants.SRC_ALPHA, GlConstants.ONE_MINUS_SRC_ALPHA)

  resetTransformStack()
  refreshBatchCaches()

  const targetAspectRatio = targetWidth / targetHeight
  const actualAspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
  let ndcScaleX: number
  let ndcScaleY: number
  if (actualAspectRatio > targetAspectRatio) {
    ndcScaleX = 2 / (targetWidth * actualAspectRatio / targetAspectRatio)
    ndcScaleY = -2 / targetHeight
  } else {
    ndcScaleX = 2 / targetWidth
    ndcScaleY = -2 / (targetHeight * targetAspectRatio / actualAspectRatio)
  }
  translateXY(ndcScaleX * targetWidth / -2, ndcScaleY * targetHeight / -2)
  scaleXY(ndcScaleX, ndcScaleY)

  render(state)

  flushBatch()
  animationFrame = requestAnimationFrame(onFrame)
}

onfocus = checkEventLoop
onblur = checkEventLoop
