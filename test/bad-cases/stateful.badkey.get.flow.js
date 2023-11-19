// @flow
import { connect, createStore, withLogger } from '../../dist/src'
import type { Effects, Store } from '../../dist/src'
import * as React from 'react'

type State = {
  isTrue: boolean,
  users: string[],
}

let initialState: State = {
  isTrue: true,
  users: [],
}

let withEffects: Effects<State> = (store) => {
  store.on('users').subscribe((_) => _.slice(0, 1))
  return store
}

let store = withEffects(withLogger(createStore(initialState)))

type Props = {
  foo: number,
  bar: string,
}

type StoreProps = {
  store: Store<State>,
}

let A = connect(store)(
  class extends React.Component<StoreProps> {
    render() {
      return <div>{this.props.store.get('a') ? 'True' : 'False'}</div>
    }
  },
)
let a = <A />
