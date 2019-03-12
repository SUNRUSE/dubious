let pageLoaded = false

function generateLoadingMessage(): null | string {
  if (!pageLoaded) {
    return `Now loading...`
  } else {
    return null
  }
}

onload = function () {
  pageLoaded = true
  checkEventLoop()
}
