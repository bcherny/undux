import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { EffectsAs } from '../../src'
import { createConnectedStoreAs } from '../../src/react'
import { withElement } from '../testUtils'

test('it should support combining stores', t => {
  let C = createConnectedStoreAs({
    A: { a: 1 },
    B: { b: 1 }
  })

  let X = C.withStores(({ A, B }) => (
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
    </>
  ))

  let Z = () => (
    <C.Container>
      <X />
    </C.Container>
  )

  withElement(Z, z => {
    assertButtons(z, 1, 1)
    Simulate.click(z.querySelectorAll('button')[0])
    assertButtons(z, 2, 1)
    Simulate.click(z.querySelectorAll('button')[1])
    assertButtons(z, 2, 2)
    Simulate.click(z.querySelectorAll('button')[0])
    assertButtons(z, 3, 2)
  })

  function assertButtons(z: Element, one: number, two: number) {
    t.is(z.querySelectorAll('button')[0].innerHTML, one.toString())
    t.is(z.querySelectorAll('button')[1].innerHTML, two.toString())
  }
})

test('it should support effects for multiple stores', t => {
  t.plan(2)

  type State = {
    A: { a: number }
    B: { b: number }
  }

  let withEffects: EffectsAs<State> = ({ A, B }) => {
    A.on('a').subscribe(a => t.is(a, 2))
    B.on('b').subscribe(b => t.is(b, 2))
    return { A, B }
  }

  let C = createConnectedStoreAs(
    {
      A: { a: 1 },
      B: { b: 1 }
    },
    withEffects
  )

  let X = C.withStores(({ A, B }) => (
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
    </>
  ))

  let Z = () => (
    <C.Container>
      <X />
    </C.Container>
  )

  withElement(Z, z => {
    Simulate.click(z.querySelectorAll('button')[0])
    Simulate.click(z.querySelectorAll('button')[1])
  })
})

test('it should support multiple instances of multiple stores', t => {
  let { Container, withStores } = createConnectedStoreAs({
    A: { a: 1 },
    B: { b: 2 }
  })
  let C = withStores(({ A, B }) => (
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
    </>
  ))
  let A = () => (
    <Container>
      <C />
    </Container>
  )
  let B = () => (
    <Container>
      <C />
    </Container>
  )

  withElement(A, a =>
    withElement(B, b => {
      t.is(a.querySelectorAll('button')[0].innerHTML, '1')
      t.is(a.querySelectorAll('button')[1].innerHTML, '2')
      t.is(b.querySelectorAll('button')[0].innerHTML, '1')
      t.is(b.querySelectorAll('button')[1].innerHTML, '2')
      Simulate.click(a.querySelectorAll('button')[0])
      t.is(a.querySelectorAll('button')[0].innerHTML, '2')
      t.is(a.querySelectorAll('button')[1].innerHTML, '2')
      t.is(b.querySelectorAll('button')[0].innerHTML, '1')
      t.is(b.querySelectorAll('button')[1].innerHTML, '2')
      Simulate.click(b.querySelectorAll('button')[0])
      t.is(a.querySelectorAll('button')[0].innerHTML, '2')
      t.is(a.querySelectorAll('button')[1].innerHTML, '2')
      t.is(b.querySelectorAll('button')[0].innerHTML, '2')
      t.is(b.querySelectorAll('button')[1].innerHTML, '2')
      Simulate.click(b.querySelectorAll('button')[1])
      t.is(a.querySelectorAll('button')[0].innerHTML, '2')
      t.is(a.querySelectorAll('button')[1].innerHTML, '2')
      t.is(b.querySelectorAll('button')[0].innerHTML, '2')
      t.is(b.querySelectorAll('button')[1].innerHTML, '3')
    })
  )
})

test('it should support custom initialStates for multiple stores', t => {
  let C = createConnectedStoreAs({
    A: { a: 1 },
    B: { b: 1 }
  })

  let X = C.withStores(({ A, B }) => (
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
    </>
  ))

  let initialStates = {
    A: { a: 3 },
    B: { b: 4 }
  }

  let Z = () => (
    <C.Container initialStates={initialStates}>
      <X />
    </C.Container>
  )

  withElement(Z, z => {
    assertButtons(z, 3, 4)
    Simulate.click(z.querySelectorAll('button')[0])
    assertButtons(z, 4, 4)
    Simulate.click(z.querySelectorAll('button')[1])
    assertButtons(z, 4, 5)
    Simulate.click(z.querySelectorAll('button')[0])
    assertButtons(z, 5, 5)
  })

  function assertButtons(z: Element, one: number, two: number) {
    t.is(z.querySelectorAll('button')[0].innerHTML, one.toString())
    t.is(z.querySelectorAll('button')[1].innerHTML, two.toString())
  }
})

test('it should support custom effects for multiple stores', t => {
  t.plan(2)

  type State = {
    A: { a: number }
    B: { b: number }
  }

  let C = createConnectedStoreAs<State>({
    A: { a: 1 },
    B: { b: 1 }
  })

  let X = C.withStores(({ A, B }) => (
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
    </>
  ))

  let effects: EffectsAs<State> = ({ A, B }) => {
    A.on('a').subscribe(a => t.is(a, 2))
    B.on('b').subscribe(b => t.is(b, 2))
    return { A, B }
  }

  let Z = () => (
    <C.Container effects={effects}>
      <X />
    </C.Container>
  )

  withElement(Z, z => {
    Simulate.click(z.querySelectorAll('button')[0])
    Simulate.click(z.querySelectorAll('button')[1])
  })
})

test('it should eagerly throw at runtime when using a consumer without a container (createConnectedStoreAs)', t => {
  let { withStores } = createConnectedStoreAs({ A: { a: 1 } })
  let A = withStores(() => <div />)
  t.throws(() => withElement(A, _ => {}), {message: /does not seem to be nested/})
})
