const activeFrameCaches: FrameCache<any>[] = []

function purgeFrameCaches(): void {
  for (let i = 0; i < activeFrameCaches.length;) {
    if (activeFrameCaches[i].purgeIfInactive()) {
      i++
    }
  }
}

function forcePurgeFrameCaches(): void {
  while (activeFrameCaches.length !== 0) {
    activeFrameCaches[0].forcePurge()
  }
}

class FrameCache<T> {
  private active = false
  private usagesThisFrame = 0
  private cached: undefined | T = undefined

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
      this.purge()
    } else {
      const cached = this.cached
      if (cached !== undefined) {
        this.update(cached)
      }
    }
    this.usagesThisFrame = 0
    return this.active
  }

  forcePurge(): void {
    if (this.active) {
      this.purge()
      this.usagesThisFrame = 0
    }
  }

  private purge(): void {
    activeFrameCaches.splice(activeFrameCaches.indexOf(this), 1)
    this.active = false
    const cached = this.cached
    if (cached !== undefined) {
      this.cached = undefined
      this.dispose(cached)
    }
  }

  get(): T {
    if (this.cached === undefined) {
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
