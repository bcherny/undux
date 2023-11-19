// @flow
import { createConnectedStore } from '../../dist/src'
import type { Store } from '../../dist/src'
import * as React from 'react'

type State = {|
  a: number,
  b: number,
|}

let initialState: State = {
  a: 1,
  b: 2,
}

let { Container, withStore } = createConnectedStore(initialState)

type Props = {|
  store: Store<State>,
|}

let A = withStore(
  class extends React.Component<Props> {
    render() {
      return this.props.store.get('c') + 2 // Error: c is not a valid key
    }
  },
)

let StoreContainer = () => (
  <Container>
    <A />
  </Container>
)
