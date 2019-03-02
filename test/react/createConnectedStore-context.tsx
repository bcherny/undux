import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { createConnectedStore } from '../../src'
import { withElement } from '../testUtils'

test('it should expose a hooks API (createConnectedStore)', t => {
  let S = createConnectedStore({ a: 1 })
  let A = () => {
    let store = S.useStore()
    return <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  }
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    t.is(_.querySelector('button')!.innerHTML, '1')
    Simulate.click(_.querySelector('button')!)
    t.is(_.querySelector('button')!.innerHTML, '2')
  })
})

test(`it should throw if you don't give it a Provider (createConnectedStore)`, t => {
  let S = createConnectedStore({ a: 1 })
  let A = () => {
    let store = S.useStore()
    return <>{store.get('a')}</>
  }
  t.throws(() => withElement(A, _ => {}), /store.get is not a function/)
})
