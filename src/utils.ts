import * as React from 'react'
import { isImmutable, is } from 'immutable';

/**
 * TODO: Avoid diffing by passing individual values into a React component
 * rather than the whole `store`, and letting React and `shouldComponentUpdate`
 * handle diffing for us.
 */
export function equals<T>(a: T, b: T): boolean {
  if (isImmutable(a) && isImmutable(b)) {
    return is(a, b)
  }
  return a === b
}

export function getDisplayName<T>(Component: React.ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}
