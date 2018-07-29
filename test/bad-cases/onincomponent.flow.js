// @flow
import { createConnectedStore, createStore, withLogger } from '../../dist/src'
import type { Effect, Store } from '../../dist/src'
import * as React from 'react'

type State = {
  a: number
}

let initialState: State = {
  a: 1
}

let withEffects: Effect<State> = store => {
  store.on('a').subscribe(a => a + 1)
  return store
}

let store = withEffects(withLogger(createStore(initialState)))

let {Container, withStore} = createConnectedStore(initialState)

type StoreProps = {|
  store: Store<State>
|}

let A = withStore(class extends React.Component<StoreProps> {
  constructor() {
    super()
    this.props.store.on('a').subscribe(a => {}) // Error: .on is not defined
  }
  render() {
    return this.props.store.get('a')
  }
})

let StoreContainer = () =>
  <Container>
    <A />
  </Container>
