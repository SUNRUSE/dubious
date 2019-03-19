onload = function () {
  loadedGameplayCriticalContent++
  initializeSaveLoad()
  state = initial()
  checkEventLoop()
}
checkEventLoop()
