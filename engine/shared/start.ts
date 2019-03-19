onload = function () {
  loadedGameplayCriticalContent++
  initializeSaveLoad()
  const quicksavePath = `${localStoragePrefix}-quicksave`
  const quicksave = loadDirect<State>(quicksavePath)
  drop(quicksavePath)
  state = quicksave !== undefined ? quicksave : initial()
  onbeforeunload = () => {
    saveDirect(quicksavePath, state)
  }
  checkEventLoop()
}
checkEventLoop()
