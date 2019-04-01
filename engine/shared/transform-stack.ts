let currentTransform = new Transform()
const transformStack: Transform[] = [currentTransform]
let transformStackPointer = 0

function pushTransformStack(identity: boolean): void {
  transformStackPointer++
  let transform: Transform
  if (transformStackPointer === transformStack.length) {
    transform = new Transform()
    transformStack.push(transform)
  } else {
    transform = transformStack[transformStackPointer]
  }
  if (identity) {
    transform.identity()
  } else {
    currentTransform.copy(transform)
  }
  currentTransform = transform
}

function popTransformStack(): void {
  transformStackPointer--
  currentTransform = transformStack[transformStackPointer]
}

function resetTransformStack(): void {
  transformStackPointer = 0
  currentTransform = transformStack[0]
  currentTransform.identity()
}

function transformGroup(content: () => void): void {
  pushTransformStack(false)
  content()
  popTransformStack()
}

function translateX(by: number): void {
  currentTransform.translateX(by)
}

function translateY(by: number): void {
  currentTransform.translateY(by)
}

function translateXY(byX: number, byY: number): void {
  currentTransform.translateX(byX)
  currentTransform.translateY(byY)
}

function scaleX(factor: number): void {
  currentTransform.scaleX(factor)
}

function scaleY(factor: number): void {
  currentTransform.scaleY(factor)
}

function scaleXY(xFactor: number, yFactor: number): void {
  scaleX(xFactor)
  scaleY(yFactor)
}

function scale(factor: number): void {
  scaleX(factor)
  scaleY(factor)
}

function rotate(radians: number): void {
  currentTransform.rotate(radians)
}
