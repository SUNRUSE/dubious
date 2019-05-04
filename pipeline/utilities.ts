import * as progress from "progress"
import settings from "./settings"

export async function asyncProgressBar<TIn, TOut>(
  description: string,
  items: ReadonlyArray<TIn>,
  parallel: boolean,
  callback: (item: TIn) => Promise<TOut>
): Promise<TOut[]> {
  const results: TOut[] = []
  if (items.length) {
    const bar = new progress(
      `${description} :bar :current/:total (:percent) :etas`,
      {
        width: 20,
        total: parallel ? items.length + 1 : items.length
      }
    )
    bar.render()
    if (parallel) {
      const promises = items.map(callback)
      bar.tick()
      for (const promise of promises) {
        results.push(await promise)
        bar.tick()
      }
    } else {
      for (const item of items) {
        results.push(await callback(item))
        bar.tick()
      }
    }
  }
  return results
}

export async function asyncParallel<TIn, TOut>(
  items: ReadonlyArray<TIn>,
  callback: (item: TIn) => Promise<TOut>
): Promise<TOut[]> {
  const promises = items.map(callback)
  const results: TOut[] = []
  for (const promise of promises) {
    results.push(await promise)
  }
  return results
}

export function reportNonFatalError(error: any): void {
  console.error(error)
  if (!settings.development) {
    process.exit(1)
  }
}

export class AsyncCache<T> {
  private promise: null | Promise<T> = null
  constructor(private readonly promiseFactory: () => Promise<T>) { }

  async get(): Promise<T> {
    if (!this.promise) {
      this.promise = this.promiseFactory()
    }
    return this.promise
  }
}

export function findLastIndex<T>(
  array: ReadonlyArray<T>,
  predicate: (item: T) => boolean
): number {
  let i = array.length - 1
  for (; i >= 0; i--) {
    if (predicate(array[i])) {
      break
    }
  }
  return i
}

const allKeyedCaches: KeyedCache<any, any>[] = []

export class KeyedCache<TKey extends string, TValue> {
  constructor(
    private readonly valueFactory: (key: TKey) => TValue
  ) {
    allKeyedCaches.push(this)
  }

  private readonly items: { [key: string]: TValue } = {}

  revoke(key: TKey): void {
    delete this.items[key]
  }

  revokeAll(): void {
    Object
      .keys(this.items)
      .forEach(key => delete this.items[key])
  }

  get(key: TKey): TValue {
    const keyString: string = key
    if (Object.prototype.hasOwnProperty.call(this.items, key)) {
      return this.items[keyString]
    } else {
      const item = this.valueFactory(key)
      this.items[keyString] = item
      return item
    }
  }

  set(key: TKey, value: TValue): void {
    const keyString: string = key
    this.items[keyString] = value
  }
}

export function revokeAllCaches(): void {
  allKeyedCaches.forEach(keyedCache => keyedCache.revokeAll())
}

export function preprocessSegments(
  segments: ReadonlyArray<string>,
  subPaths: ReadonlyArray<string>
): ReadonlyArray<string> {
  const output = segments.map(segment => {
    let upperCase = false
    let output = ``
    for (const character of segment) {
      if (character === `-`) {
        upperCase = true
      } else {
        if (upperCase) {
          output += character.toUpperCase()
          upperCase = false
        } else {
          output += character.toLowerCase()
        }
      }
    }
    return output
  })
  subPaths.forEach(path => {
    let currentFragment = ``
    while (path) {
      const character = path.slice(0, 1)
      path = path.slice(1)
      if (character === `/` || character === `\\`) {
        // Fonts can sometimes have a "/" or "\" character, which should be kept as a path (a///b = a / b).
        if (currentFragment) {
          output.push(currentFragment)
          currentFragment = ``
        } else {
          // This handles:
          // a/ = a /
          // a// = a //
          // a/// = a ///
          // a//// = a ////
          // a/b = a b
          // a//b = a b
          // a///b = a / b
          // a////b = a // b
          // a/////b = a /// b
          currentFragment = character
          while (path.slice(0, 1) === `/` || path.slice(0, 1) === `\\`) {
            currentFragment += path.slice(0, 1)
            path = path.slice(1)
          }
          if (path) {
            if (currentFragment.length > 1) output.push(currentFragment.slice(0, -1))
          } else
            output.push(currentFragment)
          currentFragment = ``
        }
      } else currentFragment += character
    }
    if (currentFragment) output.push(currentFragment)
  })
  return output
}
