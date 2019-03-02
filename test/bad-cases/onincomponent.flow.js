// @flow
import { createConnectedStore, createStore, withLogger } from '../../dist/src'
import type { Effects, Store } from '../../dist/src'
import * as React from 'react'

type State = {
  a: number
}

let initialState: State = {
  a: 1
}

let withEffects: Effects<State> = store => {
  store.on('a').subscribe(a => a + 1)
  return store
}

let { Container, withStore } = createConnectedStore(initialState)

type StoreProps = {|
  store: Store<State>
|}

let A = withStore(
  class extends React.Component<StoreProps> {
    constructor() {
      super()
      this.props.store.on('a').subscribe(a => {}) // Error: .on is not defined
    }
    render() {
      return this.props.store.get('a')
    }
  }
)

let StoreContainer = () => (
  <Container>
    <A />
  </Container>
)
