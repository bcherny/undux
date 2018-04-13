import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connect, createStore, Store } from '../src'
import { withElement } from './testUtils'

let storeA = createStore({ a: 1 })
let storeB = createStore({ b: 2 })
let withStoreA = connect(storeA)
let withStoreB = connect(storeB)

type StateA = {
  a: number
}
type StateB = {
  b: number
}

type PropsA = {
  store: Store<StateA>
}
type PropsB = {
  storeA: Store<StateA>
  store: Store<StateB>
}

let A = withStoreA(({ store }: PropsA) =>
  <B storeA={store} />
)
let B = withStoreB(({ storeA, store: storeB }: PropsB) =>
  <div>{storeA.get('a')}-{storeB.get('b')}</div>
)
let App = () =>
  <A />

// TODO: Move to stateless and stateful
test('[cross-dependencies] it should update when additional properties update', t => {
  withElement(App, _ => {
    t.is(_.innerHTML, '<div>1-2</div>')
    storeA.set('a')(3)
    t.is(_.innerHTML, '<div>3-2</div>')
  })
})
