// @flow
import { connectAs, createStore, withLogger } from '../../dist/src'
import type { Effects, Store } from '../../dist/src'
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

let Component = (
  { a, b, c }: Props // ERROR: Missing type
) => (
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
    {c.get('c')}
  </div>
)

let ConnectedComponent = connectAs({
  a: storeA,
  b: storeB
})(Component)
