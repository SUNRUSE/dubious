let errorOccurred = false

onerror = function (
  event: string,
  source: string, lineNumber: number, columnNumber: number,
  error: Error
): void {
  if (errorOccurred) {
    return
  }

  errorOccurred = true

  const message = `An unexpected error occurred.  This application will now stop.
Please ensure that your device and browser are up to date, then refresh to try again.

Technical details on the error follow:
${event}
${source}@${lineNumber}:${columnNumber}
${error}`

  if (showMessage) {
    showMessage(message)
  } else {
    alert(message)
  }

  if (checkEventLoop) {
    checkEventLoop()
  }
}
