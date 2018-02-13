import * as React from 'react'

/**
 * TODO: Avoid diffing by passing individual values into a React component
 * rather than the whole `store`, and letting React and `shouldComponentUpdate`
 * handle diffing for us.
 */
export function equals<T>(a: T, b: T): boolean {
  if (isImmutable(a) && isImmutable(b)) {
    return a.equals(b);
  }
  return a === b
}

export type Immutable = {
  equals(b: any): boolean
};

export function isImmutable(a: any): a is Immutable {
  return !!a && typeof a === 'object' && (
    '@@__IMMUTABLE_ITERABLE__@@' in a
    || '@@__IMMUTABLE_RECORD__@@' in a
  )
}

export function getDisplayName<T>(Component: React.ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}
