let animationFrame: null | number = null
let loaded = false

function checkEventLoop(): void {
  const focused = development || document.hasFocus()
  if (loaded && focused && !errorOccurred && !contextLost) {
    hideMessage()
    showCanvas()
    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(onFrame)
    }
  } else {
    hideCanvas()
    if (loaded && !errorOccurred) {
      if (!focused) {
        showMessage(`(paused)`)
      } else {
        showMessage(`Waiting for WebGL restart...`)
      }
    }
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

onload = function () {
  loaded = true
  checkEventLoop()
}
