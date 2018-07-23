// @flow
import { connectToTree } from '../../dist/src'
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

let {Container, withStore} = connectToTree(initialState)

type Props = {|
  store: Store<State>
|}

let A = withStore(class extends React.Component<Props> {
  render() {
    return this.props.store.get('a').push(4) // Error: Can't call .push on a number
  }
})

let StoreContainer = () =>
  <Container>
    <A />
  </Container>
