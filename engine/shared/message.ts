function showMessage(to: string): void {
  modifyMessage(element => {
    element.style.display = `table-cell`
    element.textContent = to
    element.innerText = to
  })
}

function hideMessage(): void {
  modifyMessage(element => element.style.display = `none`)
}

function modifyMessage(callback: (element: HTMLElement) => void): void {
  const element = document.getElementById(`message`)
  if (element) {
    callback(element)
  }
}
