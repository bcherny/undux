import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { combineAs, CombinedEffect } from '../../src/react/combineAs'
import { connectToTree } from '../../src/react/connectToTree'
import { withElement } from '../testUtils'

test('it should support combining stores', t => {

  type StateA = { a: number }
  type StateB = { b: number }

  let C = combineAs({
    A: connectToTree({ a: 1 }),
    B: connectToTree({ b: 1 })
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

  let effects: CombinedEffect<{ A: StateA, B: StateB }> = ({ A, B }) => {
    A.on('a').subscribe(a => a + 1)
    B.on('b').subscribe(b => b + 1)
  }

  let initialStates = {
    A: { a: 3 },
    B: { b: 4 }
  }

  let Z = () => <C.Container
    initialStates={initialStates}
    effects={effects}
  >
    <X />
  </C.Container >

  withElement(Z, z => {
    console.log('innner', z.innerHTML)
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
