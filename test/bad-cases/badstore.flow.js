// @flow
import { connect, createStore, withLogger, withReduxDevtools } from '../../dist/src'
import type { Plugin, Store } from '../../dist/src'
import * as React from 'react'

type State = {
  a: boolean,
  b: string[]
}

let initialState: State = {
  a: true,
  b: []
}

let store = createStore(initialState)

store.set('a')('bad')
