onload = function () {
  loadedGameplayCriticalContent++
  initializeSaveLoad()
  const quicksavePath = `${localStoragePrefix}-quicksave`
  const quicksave = loadDirect<State>(quicksavePath)
  dropDirect(quicksavePath)
  state = quicksave !== undefined ? quicksave : initial()
  onbeforeunload = () => {
    saveDirect(quicksavePath, state)
  }
  checkEventLoop()
}
checkEventLoop()

let waitingForUserInteraction = true
function onFirstUserInteraction() {
  if (!waitingForUserInteraction) {
    return
  }

  waitingForUserInteraction = false
}
onmousedown = onFirstUserInteraction
ontouchstart = onFirstUserInteraction
