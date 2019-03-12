let animationFrame: null | number = null

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
    hideCanvas()
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
}

function onFrame(time: number): void {
  animationFrame = null
  const gl = getGl()
  gl.canvas.width = gl.canvas.clientWidth
  gl.canvas.height = gl.canvas.clientHeight
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  animationFrame = requestAnimationFrame(onFrame)
}

onfocus = checkEventLoop
onblur = checkEventLoop
