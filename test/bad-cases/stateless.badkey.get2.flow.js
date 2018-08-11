// @flow
import { connect, createStore, withLogger } from '../../dist/src'
import type { Effects, Store } from '../../dist/src'
import * as React from 'react'

type State = {
  isTrue: boolean,
  users: string[]
}

let initialState: State = {
  isTrue: true,
  users: []
}

let withEffects: Effects<State> = store => {
  store.on('users').subscribe(_ => _.slice(0, 1))
  return store
}

let store = withEffects(withLogger(createStore(initialState)))

type StoreProps = {
  store: Store<State>
}

/////////////////// A ///////////////////

type Props = StoreProps & {
  foo: number,
  bar: string
}

let A = connect(store)(({ foo, bar, store }: Props) =>
  <div>
    {store.get('a') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue')(false)}>Update</button>
  </div>
)
let a = <A />
