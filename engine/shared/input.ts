const heldKeys: string[] = []

function keyIsIdentified(code: string): boolean {
  switch (code) {
    case ``:
    case `Unidentified`:
      return false
    default:
      return true
  }
}

onkeydown = e => {
  if (keyIsIdentified(e.code)) {
    if (heldKeys.indexOf(e.code) === -1) {
      heldKeys.push(e.code)
    }
  }
}

onkeyup = e => {
  if (keyIsIdentified(e.code)) {
    const index = heldKeys.indexOf(e.code)
    if (index !== -1) {
      heldKeys.splice(index, 1)
    }
  }
}

function held(input: string): boolean {
  return heldKeys.indexOf(input) !== -1
}
