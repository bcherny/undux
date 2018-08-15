import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { Effects } from '../../src'
import { createConnectedStore } from '../../src/react/createConnectedStore'
import { withElement } from '../testUtils'

test('it should render', t => {
  let {Container, withStore} = createConnectedStore({ a: 1 })
  let B = withStore(({ store }) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container><B /></Container>

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })
})

test('it should support effects', t => {
  t.plan(1)

  type State = {
    a: number
  }

  let withEffects: Effects<State> = store => {
    store.on('a').subscribe(a => {
      t.is(a, 2)
    })
    return store
  }

  let { Container, withStore } = createConnectedStore({ a: 1 }, withEffects)

  let C = withStore(({store}) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container><C /></Container>

  withElement(A, _ =>
    Simulate.click(_.querySelector('button')!)
  )
})

test('it should support multiple instances of a store', t => {
  let {Container, withStore} = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container><C /></Container>
  let B = () => <Container><C /></Container>

  withElement(A, a =>
    withElement(B, b => {
      t.is(a.querySelector('button')!.innerHTML, '1')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(a.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '2')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(b.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '2')
      t.is(b.querySelector('button')!.innerHTML, '2')
    })
  )
})

test('it should support multiple instances of a store, with disjoint lifecycles', t => {
  let {Container, withStore} = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container><C /></Container>
  let B = () => <Container><C /></Container>

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })

  withElement(B, b => {
    t.is(b.querySelector('button')!.innerHTML, '1')
    Simulate.click(b.querySelector('button')!)
    t.is(b.querySelector('button')!.innerHTML, '2')
  })
})

test('it should support multiple instances of a store in one tree, with disjoint lifecycles', t => {
  let Test = createConnectedStore({ isA: true })
  let {Container, withStore} = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) =>
    <button id='C' onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container><C /></Container>
  let B = () => <Container><C /></Container>

  let D = Test.withStore(({store}) =>
    <>
      {store.isA ? <A /> : <B />}
      <button id='D' onClick={() => store.isA = !store.isA} />
    </>
  )
  let E = () => <Test.Container><D /></Test.Container>

  withElement(E, e => {
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')

    // Swap subtree
    Simulate.click(e.querySelector('#D')!)
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')

    // Swap subtree
    Simulate.click(e.querySelector('#D')!)
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')
  })
})

test('it should support interleaved stores', t => {
  let A = createConnectedStore({ a: 1 })
  let B = createConnectedStore({ b: 1 })
  let C = A.withStore(({ store }) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let D = B.withStore(({ store }) =>
    <button onClick={() => store.b = store.b + 1}>
      {store.b}
    </button>
  )
  let X = () => <A.Container>
    <C />
    <B.Container>
      <D />
      <C />
    </B.Container>
  </A.Container>

  withElement(X, x => {
    assertButtons(x, 1, 1, 1)
    Simulate.click(x.querySelectorAll('button')[0])
    assertButtons(x, 2, 1, 2)
    Simulate.click(x.querySelectorAll('button')[1])
    assertButtons(x, 2, 2, 2)
    Simulate.click(x.querySelectorAll('button')[2])
    assertButtons(x, 3, 2, 3)
  })

  function assertButtons(x: Element, one: number, two: number, three: number) {
    t.is(x.querySelectorAll('button')[0].innerHTML, one.toString())
    t.is(x.querySelectorAll('button')[1].innerHTML, two.toString())
    t.is(x.querySelectorAll('button')[2].innerHTML, three.toString())
  }
})

test('it should support custom initialState', t => {
  let {Container, withStore} = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container initialState={{a: 101}}><C /></Container>
  let B = () => <Container><C /></Container>

  withElement(A, a =>
    withElement(B, b => {
      t.is(a.querySelector('button')!.innerHTML, '101')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(a.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '102')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(b.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '102')
      t.is(b.querySelector('button')!.innerHTML, '2')
    })
  )
})

test('it should support custom effects', t => {
  t.plan(1)

  type State = {
    a: number
  }

  let { Container, withStore } = createConnectedStore({ a: 1 })

  let withEffects: Effects<State> = store => {
    store.on('a').subscribe(a => {
      t.is(a, 2)
    })
    return store
  }

  let C = withStore(({store}) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.a}
    </button>
  )
  let A = () => <Container effects={withEffects}>
    <C />
  </Container>

  withElement(A, _ =>
    Simulate.click(_.querySelector('button')!)
  )
})

test('it should eagerly throw at runtime when using a consumer without a container', t => {
  let {withStore} = createConnectedStore({ a: 1 })
  let A = withStore(() => <div />)
  t.throws(() => withElement(A, _ => {}), /does not seem to be nested/)
})

test('it should support selectors', t => {
  type State = {
    a: number
    b: number
    readonly c: number
  }
  let initialState: State = {
    a: 1,
    b: 1,
    get c() {
      return this.a + this.b
    }
  }
  let {Container, withStore} = createConnectedStore(initialState)
  let B = withStore(({ store }) =>
    <button onClick={() => store.a = store.a + 1}>
      {store.c + 1}
    </button>
  )
  let A = () => <Container><B /></Container>

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })
})
