// @flow
import { createConnectedStoreAs } from '../../dist/src'
import type { EffectAs, Store } from '../../dist/src'
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

let {Container, withStores} = createConnectedStoreAs(initialState, withEffects)

type Props = {|
  X: Store<StateX>,
  Y: Store<StateY>
|}

let A = withStores(class extends React.Component<Props> {
  render() {
    return <div>
      {this.props.X.get('a') * 4}
      {this.props.X.get('b') * 4}
      {this.props.Y.get('c').toUpperCase()}
      {this.props.Y.get('e') * 8} // Error: e is not a valid key
    </div>
  }
})

let StoreContainer = () =>
  <Container>
    <A />
  </Container>
