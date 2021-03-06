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
    waitingForUserInteraction = true
    forcePurgeFrameCaches()
    if (audioContext !== null) {
      audioContext.close()
      audioContext = null
    }
    hideCanvas()
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
}

let displayWidth: number
let displayHeight: number

function onFrame(time: number): void {
  animationFrame = null

  if (audioContext !== null) {
    if (audioContext.state === `suspended`) {
      previousTime = null
      audioContext.resume()
    }
    time = audioContext.currentTime
  } else {
    time /= 1000
  }

  if (previousTime !== null) {
    elapsed(Math.max(0, Math.min(0.1, time - previousTime)))
  }

  previousTime = time

  const gl = getGl()
  gl.canvas.width = gl.canvas.clientWidth
  gl.canvas.height = gl.canvas.clientHeight
  displayWidth = gl.drawingBufferWidth
  displayHeight = gl.drawingBufferHeight
  gl.viewport(0, 0, displayWidth, displayHeight)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(GlConstants.COLOR_BUFFER_BIT)
  gl.enable(GlConstants.BLEND)
  gl.blendFunc(GlConstants.ONE, GlConstants.ONE_MINUS_SRC_ALPHA)

  populatingRenderTarget = null
  resetTransformStack()
  purgeFrameCaches()

  atlasSound.getOrCreate()

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

  render()

  flushBatch()
  animationFrame = requestAnimationFrame(onFrame)
}

onfocus = checkEventLoop
onblur = checkEventLoop
