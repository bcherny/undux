// @flow
import { connectToTree, Effect } from '../../dist/src'
import type { Store } from '../../dist/src'
import * as React from 'react'

type State = {|
  a: number,
  b: number
|}

let initialState: State = {
  a: 1,
  b: 2
}

let withEffects: Effect<State> = store => {
  store.on('a').subscribe(a => a.toUpperCase())
  return store
}

let {Container, withStore} = connectToTree(initialState, withEffects)

type Props = {|
  store: Store<State>,
  x: boolean
|}

let A = ({store}: Props) =>
  store.get('a').push(4) // Error: Can't call .push on a number

let B = withStore(A)

let StoreContainer = () =>
  <Container>
    <B x={true} />
  </Container>
