// @flow
import { connectAs, createStore, withLogger } from '../../dist/src'
import type { Plugin, Store } from '../../dist/src'
import * as React from 'react'

type A = {| a: number |}
type B = {| b: string |}

let initA: A = { a: 1 }
let initB: B = { b: 'c' }

let storeA = createStore(initA)
let storeB = createStore(initB)

type Props = {|
  a: Store<A>,
  b: Store<B>
|}

class Component extends React.Component<Props> {
  render() {
    return <div>
      {this.props.a.get('a') * 4}
      {this.props.b.get('b').concat('d')}
      {this.props.b.get('b').push(4)} // ERROR: Can't call push on string
    </div>
  }
}

let ConnectedComponent = connectAs({
  a: storeA,
  b: storeB
})(Component)
