import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connectToTreeAs } from '../../src/react'
import { EffectAs } from '../../src/react/connectToTreeAs'
import { withElement } from '../testUtils'

test('it should support combining stores', t => {

  let C = connectToTreeAs({
    A: { a: 1 },
    B: { b: 1 }
  })

  let X = C.withStores(({ A, B }) =>
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>
        {A.get('a')}
      </button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>
        {B.get('b')}
      </button>
    </>
  )

  let Z = () => <C.Container>
    <X />
  </C.Container >

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

test('it should support initialStates for multiple stores', t => {

  let C = connectToTreeAs({
    A: { a: 1 },
    B: { b: 1 }
  })

  let X = C.withStores(({ A, B }) =>
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>
        {A.get('a')}
      </button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>
        {B.get('b')}
      </button>
    </>
  )

  let initialStates = {
    A: { a: 3 },
    B: { b: 4 }
  }

  let Z = () => <C.Container initialStates={initialStates}>
    <X />
  </C.Container >

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

test('it should support effects for multiple stores', t => {
  t.plan(2)

  type StateA = { a: number }
  type StateB = { b: number }

  let C = connectToTreeAs({
    A: { a: 1 },
    B: { b: 1 }
  })

  let X = C.withStores(({ A, B }) =>
    <>
      <button onClick={() => A.set('a')(A.get('a') + 1)}>
        {A.get('a')}
      </button>
      <button onClick={() => B.set('b')(B.get('b') + 1)}>
        {B.get('b')}
      </button>
    </>
  )

  let effects: EffectAs<{ A: StateA, B: StateB }> = ({ A, B }) => {
    A.on('a').subscribe(a => t.is(a, 2))
    B.on('b').subscribe(b => t.is(b, 2))
  }

  let Z = () => <C.Container effects={effects}>
    <X />
  </C.Container >

  withElement(Z, z => {
    Simulate.click(z.querySelectorAll('button')[0])
    Simulate.click(z.querySelectorAll('button')[1])
  })
})
