import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { createConnectedStoreAs, createStore, Store } from '../../src'
import { withElement } from '../testUtils'

test('it should expose a hooks API (createConnectedStoreAs)', t => {
  let S = createConnectedStoreAs({ a: { b: 1 } })
  let A = () => {
    let stores = S.useStores()
    return <button onClick={() => stores.a.set('b')(stores.a.get('b') + 1)}>
      {stores.a.get('b')}
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

test(`it should throw if you don't give it a Provider (createConnectedStoreAs)`, t => {
  let S = createConnectedStoreAs({ a: { b: 1 } })
  let A = () => {
    let stores = S.useStores()
    return <>{stores.a.get('b')}</>
  }
  t.throws(
    () => withElement(A, _ => {}),
    /Cannot read property \'get\' of undefined/
  )
})
