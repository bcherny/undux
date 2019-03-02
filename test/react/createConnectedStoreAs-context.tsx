import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { createConnectedStoreAs, createStore, Store } from '../../src'
import { withElement } from '../testUtils'

test('it should expose an internal Context API (createConnectedStoreAs)', t => {
  let S = createConnectedStoreAs({ a: { b: 1 } })
  let Context = (S as any)[
    '__CONTEXT_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
  ] as React.Context<{ a: Store<{ b: number }> }>
  let A = () => (
    <Context.Consumer>
      {store => (
        <button onClick={() => store.a.set('b')(store.a.get('b') + 1)}>
          {store.a.get('b')}
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

test('it should not be usable with a <Provider /> instead of a <Container /> (createConnectedStoreAs)', t => {
  let S = createConnectedStoreAs({ a: { b: 1 } })
  let Context = (S as any)[
    '__CONTEXT_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
  ] as React.Context<{ a: Store<{ b: number }> }>
  let A = () => (
    <Context.Consumer>
      {store => (
        <button onClick={() => store.a.set('b')(store.a.get('b') + 1)}>
          {store.a.get('b')}
        </button>
      )}
    </Context.Consumer>
  )
  let B = () => (
    <Context.Provider value={{ a: createStore({ b: 1 }) }}>
      <A />
    </Context.Provider>
  )
  withElement(B, _ => {
    t.is(_.querySelector('button')!.innerHTML, '1')
    Simulate.click(_.querySelector('button')!)
    t.is(_.querySelector('button')!.innerHTML, '1')
  })
})

test(`it should throw if you don't give it a Provider (createConnectedStoreAs)`, t => {
  let S = createConnectedStoreAs({ a: { b: 1 } })
  let Context = (S as any)[
    '__CONTEXT_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
  ] as React.Context<{ a: Store<{ b: number }> }>
  let A = () => <Context.Consumer>{store => store.a.get('b')}</Context.Consumer>
  t.throws(
    () => withElement(A, _ => {}),
    /Cannot read property \'get\' of undefined/
  )
})
