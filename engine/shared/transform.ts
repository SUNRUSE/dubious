class Transform {
  xx = 1
  xy = 0
  yx = 0
  yy = 1
  x = 0
  y = 0

  applyX(x: number, y: number): number {
    return x * this.xx + y * this.yx + this.x
  }

  applyY(x: number, y: number): number {
    return x * this.xy + y * this.yy + this.y
  }

  copy(to: Transform): void {
    to.xx = this.xx
    to.xy = this.xy
    to.yx = this.yx
    to.yy = this.yy
    to.x = this.x
    to.y = this.y
  }

  identity(): void {
    this.xx = 1
    this.xy = 0
    this.yx = 0
    this.yy = 1
    this.x = 0
    this.y = 0
  }

  translateX(by: number): void {
    this.x += this.xx * by
    this.y += this.yx * by
  }

  translateY(by: number): void {
    this.x += this.xy * by
    this.y += this.yy * by
  }

  scaleX(factor: number): void {
    this.xx *= factor
    this.xy *= factor
  }

  scaleY(factor: number): void {
    this.yx *= factor
    this.yy *= factor
  }

  rotate(radians: number): void {
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const xx = this.xx
    const xy = this.xy
    const yx = this.yx
    const yy = this.yy
    this.xx = xx * cos + xy * sin
    this.yx = xy * cos - xx * sin
    this.xy = yx * cos + yy * sin
    this.yy = yy * cos - yx * sin
  }
}
