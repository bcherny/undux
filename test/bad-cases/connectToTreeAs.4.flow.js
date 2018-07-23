// @flow
import { connectToTreeAs, EffectAs } from '../../dist/src'
import type { Store } from '../../dist/src'
import * as React from 'react'

type StateX = {|
  a: number,
  b: number
|}

type StateY = {|
  c: string,
  d: string
|}

type State = {|
  X: StateX,
  Y: StateY
|}

let initialState: State = {
  X: {
    a: 1,
    b: 2
  },
  Y: {
    c: 'i',
    d: 'j'
  }
}

let withEffects: EffectAs<State> = store => {
  store.X.on('a').subscribe(a => a * 4)
  store.Y.on('d').subscribe(d => d.toLowerCase())
  return store
}

let {Container, withStores} = connectToTreeAs(initialState, withEffects)

type Props = {|
  X: Store<StateX>,
  Y: Store<StateY>
|}

let A = withStores((props: Props) =>
  <div>
    {props.X.get('a') * 4}
    {props.X.get('b') * 4}
    {props.Y.get('c').toUpperCase()}
    {props.Y.get('e') * 8} // Error: e is not a valid key
  </div>
)

let StoreContainer = () =>
  <Container>
    <A />
  </Container>
