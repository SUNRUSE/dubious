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
