import * as React from 'react'
import { is } from 'immutable';

/**
 * TODO: Avoid diffing by passing individual values into a React component
 * rather than the whole `store`, and letting React and `shouldComponentUpdate`
 * handle diffing for us.
 */
export function equals<T>(a: T, b: T): boolean {
  return is(a, b)
}

export function getDisplayName<T>(Component: React.ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}
