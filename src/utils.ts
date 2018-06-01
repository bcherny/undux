import { ComponentType } from 'react'

/**
 * TODO: Avoid diffing by passing individual values into a React component
 * rather than the whole `store`, and letting React and `shouldComponentUpdate`
 * handle diffing for us.
 */
export function equals<T>(a: T, b: T): boolean {
  if (isImmutable(a) && isImmutable(b)) {
    return a.equals(b)
  }
  return a === b
}

export type Immutable = {
  equals(b: any): boolean
}

export function isImmutable(a: any): a is Immutable {
  return !!a && typeof a === 'object' && (
    '@@__IMMUTABLE_ITERABLE__@@' in a
    || '@@__IMMUTABLE_RECORD__@@' in a
  )
}

export function getDisplayName<T>(Component: ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}

export function mapValues<O extends object, K extends keyof O, T>(
  o: O,
  f: (value: O[K], key: K) => T
): {[K in keyof O]: T} {
  let result: {[K in keyof O]: T} = {} as any
  keys(o).forEach(k =>
    result[k] = f(o[k] as any, k as any) // TODO: Improve this
  )
  return result
}

// Strict Object.keys
export function keys<O extends object>(o: O): (keyof O)[] {
  return Object.keys(o) as any
}

export function some<O extends object>(o: O, f: <K extends keyof O>(v: O[K], k: K) => boolean): boolean {
  for (let k in o) {
    if (f(o[k], k)) {
      return true
    }
  }
  return false
}
