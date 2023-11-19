import * as React from 'react'
import { connect, createStore, Store } from '../src'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('cyclical dependencies', () => {
  test('it should show a console error when there is a cycle (1)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    let store = createStore({ a: 1 }, { isDevMode: true })
    store.on('a').subscribe((a) => store.set('a')(a))
    store.set('a')(2)
  })

  test('it should show a console error when there is a cycle (2)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    let store = createStore({ a: 1, b: 2 }, { isDevMode: true })
    store.on('a').subscribe((a) => store.set('b')(a))
    store.on('b').subscribe((a) => store.set('a')(a))
    store.set('a')(2)
  })

  test('it should show a console error when there is a cycle (3)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    let store = createStore({ a: 1, b: 2 }, { isDevMode: true })
    store.on('a').subscribe((a) => store.set('b')(a))
    store.on('b').subscribe((a) => store.set('a')(a))
    store.set('b')(3)
  })

  test('it should show a console error when there is a cycle (4)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)

    let store = createStore({ a: 1 }, { isDevMode: true })
    let withStore = connect(store)

    type State = {
      a: number
    }

    type Props = {
      store: Store<State>
    }

    store.on('a').subscribe(() => store.set('a')(2))

    let A = withStore(({ store }: Props) => (
      <button onClick={() => store.set('a')(2)} />
    ))

    render(<A />)
    fireEvent.click(screen.getByRole('button'))
  })

  test('it should show a console error when there is a cycle (5)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)

    let storeA = createStore({ a: 1 }, { isDevMode: true })
    let storeB = createStore({ b: 2 }, { isDevMode: true })
    let withStoreA = connect(storeA)
    let withStoreB = connect(storeB)

    storeA.on('a').subscribe((a) => storeB.set('b')(a))
    storeB.on('b').subscribe((b) => storeA.set('a')(b))

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
      store: Store<StateB>
    }

    let A = withStoreA(() => <B />)
    let B = withStoreB(({ store: storeB }: PropsB) => (
      <button onClick={() => storeB.set('b')(1)} />
    ))

    render(<A />)
    fireEvent.click(screen.getByRole('button'))
  })

  test('it should show a console error when there is a cycle (6)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)

    let storeA = createStore({ a: 1 }, { isDevMode: true })
    let storeB = createStore({ b: 2 }, { isDevMode: true })
    let withStoreA = connect(storeA)
    let withStoreB = connect(storeB)

    storeA.on('a').subscribe((a) => storeB.set('b')(a))
    storeB.on('b').subscribe((b) => storeA.set('a')(b))

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
      store: Store<StateB>
      storeA: Store<StateA>
    }

    let A = withStoreA(({ store }: PropsA) => <B storeA={store} />)
    let B = withStoreB(({ storeA }: PropsB) => (
      <button onClick={() => storeA.set('a')(1)} />
    ))

    render(<A />)
    fireEvent.click(screen.getByRole('button'))
  })
})
