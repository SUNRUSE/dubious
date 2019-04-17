function linearInterpolate(from: number, to: number, by: number): number {
  return from + (to - from) * by
}

function magnitudeSquared(x: number, y: number): number {
  return x * x + y * y
}

function magnitude(x: number, y: number): number {
  return Math.sqrt(magnitudeSquared(x, y))
}

function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  return magnitudeSquared(x2 - x1, y2 - y1)
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(distanceSquared(x1, y1, x2, y2))
}
