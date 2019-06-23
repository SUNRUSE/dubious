const targetWidth = 426
const targetHeight = 240

const localStoragePrefix = `example`

type State = null

type Input =
  | `up`
  | `down`
  | `left`
  | `right`
  | `select`
  | `cancel`

const keyBindings: { readonly [key in Input]: Key[] } = {
  up: [`KeyW`, `ArrowUp`],
  down: [`KeyS`, `ArrowDown`],
  left: [`KeyA`, `ArrowLeft`],
  right: [`KeyD`, `ArrowRight`],
  select: [`Enter`],
  cancel: [`Escape`]
}

function keyBeingBound(): null | Input {
  return null
}

function initial(): State {
  return null
}

function elapsed(deltaSeconds: number): void {
}

function render(): void {
}
