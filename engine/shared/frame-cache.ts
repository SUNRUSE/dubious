const activeFrameCaches: FrameCache<any>[] = []

function purgeFrameCaches(): void {
  for (let i = 0; i < activeFrameCaches.length;) {
    if (activeFrameCaches[i].purgeIfInactive()) {
      i++
    }
  }
}

class FrameCache<T> {
  private active = false
  private usagesThisFrame = 0
  private cached: null | T = null

  create(): T {
    throw new Error(`FrameCache<T>.create is not implemented`)
  }

  update(cached: T): void {
    throw new Error(`FrameCache<T>.update is not implemented`)
  }

  dispose(cached: T): void {
    throw new Error(`FrameCache<T>.dispose is not implemented`)
  }

  keepAlive(): void {
    this.usagesThisFrame++
  }

  purgeIfInactive(): boolean {
    if (this.usagesThisFrame === 0) {
      activeFrameCaches.splice(activeFrameCaches.indexOf(this), 1)
      this.active = false
      const cached = this.cached
      if (cached !== null) {
        this.cached = null
        this.dispose(cached)
      }
    } else {
      const cached = this.cached
      if (cached !== null) {
        this.update(cached)
      }
    }
    this.usagesThisFrame = 0
    return this.active
  }

  get(): T {
    if (this.cached === null) {
      this.cached = this.create()
      if (!this.active) {
        activeFrameCaches.push(this)
        this.active = true
      }
    }
    this.usagesThisFrame++
    return this.cached
  }
}
