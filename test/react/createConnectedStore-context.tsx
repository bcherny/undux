import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { createConnectedStore, createStore, Store } from '../../src'
import { withElement } from '../testUtils'

test('it should expose an internal Context API', t => {
  let S = createConnectedStore({ a: 1 })
  let Context = (S as any)['__CONTEXT_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'] as React.Context<Store<{a: number}>>
  let A = () => (
    <Context.Consumer>
      {store => (
        <button onClick={() => store.set('a')(store.get('a') + 1)}>
          {store.get('a')}
        </button>
      )}
    </Context.Consumer>
  )
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

test('it should not be usable with a <Provider /> instead of a <Container />', t => {
  let S = createConnectedStore({ a: 1 })
  let Context = (S as any)['__CONTEXT_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'] as React.Context<Store<{a: number}>>
  let A = () => (
    <Context.Consumer>
      {store => (
        <button onClick={() => store.set('a')(store.get('a') + 1)}>
          {store.get('a')}
        </button>
      )}
    </Context.Consumer>
  )
  let B = () => (
    <Context.Provider value={createStore({a: 1})}>
      <A />
    </Context.Provider>
  )
  withElement(B, _ => {
    t.is(_.querySelector('button')!.innerHTML, '1')
    Simulate.click(_.querySelector('button')!)
    t.is(_.querySelector('button')!.innerHTML, '1')
  })
})

test(`it should throw if you don't give it a Provider`, t => {
  let S = createConnectedStore({ a: 1 })
  let Context = (S as any)['__CONTEXT_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'] as React.Context<Store<{a: number}>>
  let A = () => (
    <Context.Consumer>
      {store => store.get('a')}
    </Context.Consumer>
  )
  t.throws(() => withElement(A, _ => {}), /store.get is not a function/)
})
