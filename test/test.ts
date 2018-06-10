/**
 * Used internally for FB projects running in NodeJS env.
 * We need this here for Ava, and for anyone using Undux
 * with server-side rendering.
 */
if (global && !('__DEV__' in global)) {
  (global as any).__DEV__ = false
}

import './cyclical-dependencies'
import './immutable'
import './stateful'
import './stateless'
import './utils'
