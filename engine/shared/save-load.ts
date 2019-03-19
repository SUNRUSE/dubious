interface IJsonArray extends ReadonlyArray<Json> { }

type Json =
  | string
  | number
  | boolean
  | IJsonArray
  | IJsonObject
  | null

interface IJsonObject {
  readonly [key: string]: Json
}

let saveLoadAvailable = false

function initializeSaveLoad(): void {
  if (`localStorage` in window) {
    try {
      localStorage.setItem(`${localStoragePrefix}-check`, `check`)
      saveLoadAvailable = true
    } catch { }
  }
}

function save<T extends Json>(name: string, content: T): boolean {
  return saveDirect(`${localStoragePrefix}-game-${name}`, content)
}

function saveDirect<T extends Json>(key: string, content: T): boolean {
  if (saveLoadAvailable) {
    try {
      localStorage.setItem(key, JSON.stringify(content))
      return true
    } catch { }
  }
  return false
}

function load<T extends Json>(name: string): undefined | T {
  return loadDirect(`${localStoragePrefix}-game-${name}`)
}

function loadDirect<T extends Json>(key: string): undefined | T {
  if (saveLoadAvailable) {
    try {
      const json = localStorage.getItem(key)
      if (json !== null) {
        return JSON.parse(json)
      }
    } catch { }
  }
  return undefined
}

function drop(name: string): boolean {
  return dropDirect(`${localStoragePrefix}-game-${name}`)
}

function dropDirect(key: string): boolean {
  if (saveLoadAvailable) {
    try {
      localStorage.removeItem(key)
      return true
    } catch { }
  }
  return false
}
