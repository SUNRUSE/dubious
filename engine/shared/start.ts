type Quicksave = {
  readonly elapsedSeconds: number
  readonly state: State
}

onload = function () {
  loadedGameplayCriticalContent++
  initializeSaveLoad()
  const quicksavePath = `${localStoragePrefix}-quicksave`
  const quicksave = loadDirect<Quicksave>(quicksavePath)
  dropDirect(quicksavePath)
  if (quicksave === undefined) {
    state = initial()
  } else {
    elapsedSeconds = quicksave.elapsedSeconds
    state = quicksave.state
  }

  onbeforeunload = () => {
    saveDirect(quicksavePath, {
      elapsedSeconds,
      state
    })
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
