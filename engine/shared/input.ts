
// This list is created from the common codes of https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code.
type Key =
  | `Escape`
  | `Digit0`
  | `Digit1`
  | `Digit2`
  | `Digit3`
  | `Digit4`
  | `Digit5`
  | `Digit6`
  | `Digit7`
  | `Digit8`
  | `Digit8`
  | `Digit9`
  | `Minus`
  | `Equal`
  | `Backspace`
  | `Tab`
  | `KeyQ`
  | `KeyW`
  | `KeyE`
  | `KeyR`
  | `KeyT`
  | `KeyY`
  | `KeyU`
  | `KeyI`
  | `KeyO`
  | `KeyP`
  | `BracketLeft`
  | `BracketRight`
  | `Enter`
  | `ControlLeft`
  | `KeyA`
  | `KeyS`
  | `KeyD`
  | `KeyF`
  | `KeyG`
  | `KeyH`
  | `KeyJ`
  | `KeyK`
  | `KeyL`
  | `Semicolon`
  | `Quote`
  | `Backquote`
  | `ShiftLeft`
  | `KeyZ`
  | `KeyX`
  | `KeyC`
  | `KeyV`
  | `KeyB`
  | `KeyN`
  | `KeyM`
  | `Comma`
  | `Period`
  | `Slash`
  | `ShiftRight`
  | `NumpadMultiply`
  | `AltLeft`
  | `Space`
  | `CapsLock`
  | `F1`
  | `F2`
  | `F3`
  | `F4`
  | `F5`
  | `F6`
  | `F7`
  | `F8`
  | `F9`
  | `F10`
  | `Numpad7`
  | `Numpad8`
  | `Numpad9`
  | `NumpadSubtract`
  | `Numpad4`
  | `Numpad5`
  | `Numpad6`
  | `NumpadAdd`
  | `Numpad1`
  | `Numpad2`
  | `Numpad3`
  | `Numpad0`
  | `NumpadDecimal`
  | `IntlBackslash`
  | `F11`
  | `F12`
  | `IntlYen`
  | `NumpadEnter`
  | `ControlRight`
  | `NumpadDivide`
  | `AltRight`
  | `NumLock`
  | `Home`
  | `ArrowUp`
  | `PageUp`
  | `ArrowLeft`
  | `ArrowRight`
  | `End`
  | `ArrowDown`
  | `PageDown`
  | `Delete`

const heldKeys: Key[] = []

function keyIsIdentified(code: string): null | Key {
  switch (code) {
    case `Escape`:
    case `Digit0`:
    case `Digit1`:
    case `Digit2`:
    case `Digit3`:
    case `Digit4`:
    case `Digit5`:
    case `Digit6`:
    case `Digit7`:
    case `Digit8`:
    case `Digit8`:
    case `Digit9`:
    case `Minus`:
    case `Equal`:
    case `Backspace`:
    case `Tab`:
    case `KeyQ`:
    case `KeyW`:
    case `KeyE`:
    case `KeyR`:
    case `KeyT`:
    case `KeyY`:
    case `KeyU`:
    case `KeyI`:
    case `KeyO`:
    case `KeyP`:
    case `BracketLeft`:
    case `BracketRight`:
    case `Enter`:
    case `ControlLeft`:
    case `KeyA`:
    case `KeyS`:
    case `KeyD`:
    case `KeyF`:
    case `KeyG`:
    case `KeyH`:
    case `KeyJ`:
    case `KeyK`:
    case `KeyL`:
    case `Semicolon`:
    case `Quote`:
    case `Backquote`:
    case `ShiftLeft`:
    case `KeyZ`:
    case `KeyX`:
    case `KeyC`:
    case `KeyV`:
    case `KeyB`:
    case `KeyN`:
    case `KeyM`:
    case `Comma`:
    case `Period`:
    case `Slash`:
    case `ShiftRight`:
    case `NumpadMultiply`:
    case `AltLeft`:
    case `Space`:
    case `CapsLock`:
    case `F1`:
    case `F2`:
    case `F3`:
    case `F4`:
    case `F5`:
    case `F6`:
    case `F7`:
    case `F8`:
    case `F9`:
    case `F10`:
    case `Numpad7`:
    case `Numpad8`:
    case `Numpad9`:
    case `NumpadSubtract`:
    case `Numpad4`:
    case `Numpad5`:
    case `Numpad6`:
    case `NumpadAdd`:
    case `Numpad1`:
    case `Numpad2`:
    case `Numpad3`:
    case `Numpad0`:
    case `NumpadDecimal`:
    case `IntlBackslash`:
    case `F11`:
    case `F12`:
    case `IntlYen`:
    case `NumpadEnter`:
    case `ControlRight`:
    case `NumpadDivide`:
    case `AltRight`:
    case `NumLock`:
    case `Home`:
    case `ArrowUp`:
    case `PageUp`:
    case `ArrowLeft`:
    case `ArrowRight`:
    case `End`:
    case `ArrowDown`:
    case `PageDown`:
    case `Delete`:
      return code
    default:
      return null
  }
}

onkeydown = e => {
  const key = keyIsIdentified(e.code)
  if (key !== null) {
    if (heldKeys.indexOf(key) === -1) {
      heldKeys.push(key)
    }
  }
}

onkeyup = e => {
  const key = keyIsIdentified(e.code)
  if (key !== null) {
    const index = heldKeys.indexOf(key)
    if (index !== -1) {
      heldKeys.splice(index, 1)
    }
  }
}

function held(input: Key): boolean {
  return heldKeys.indexOf(input) !== -1
}
