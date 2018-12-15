// @flow
import { createConnectedStore } from '../../dist/src'
import type { Effects, Store } from '../../dist/src'
import * as React from 'react'

type State = {|
  a: number,
  b: number
|}

let initialState: State = {
  a: 1,
  b: 2
}

let withEffects: Effects<State> = store => {
  store.on('a').subscribe(a => a.toUpperCase())
  return store
}

let {Container, withStore} = createConnectedStore<State>(
  initialState,
  withEffects
)

type Props = {|
  store: Store<State>,
  x: boolean
|}

let A = ({store}: Props) =>
  store.setFrom_EXPERIMENTAL(store => store.set('c')(2)) // Error: c is not a valid key

let B = withStore(A)

let StoreContainer = () =>
  <Container>
    <B x={true} />
  </Container>
