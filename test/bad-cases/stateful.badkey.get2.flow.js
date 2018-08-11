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

type Props = StoreProps & {
  foo: number,
  bar: string
}

let A = connect(store)(class extends React.Component<Props> {
  render() {
    return <div>
      {this.props.foo * 12}
      {this.props.bar + 'baz'}
      {this.props.store.get('a')}
    </div>
  }
})
let a = <A />
