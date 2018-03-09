import * as React from 'react'

export const objectIs =
  Object.is ||
  function objectIs(x, y) {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y
    }
    return x !== x && y !== y
  }

export function getDisplayName<T>(Component: React.ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}
