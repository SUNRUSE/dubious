const errorOccurred = false

onerror = function (
  event: string,
  source: string, lineNumber: number, columnNumber: number,
  error: Error
): void {
  console.log(`Error in ${source}@${lineNumber}:${columnNumber}:`)
  console.log(event)
  console.log(error)
}
