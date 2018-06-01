import { test } from 'ava'
import * as React from 'react'
import { renderIntoDocument, Simulate } from 'react-dom/test-utils'
import { connect, connectAs, createStore, Store } from '../src'
import { withElement } from './testUtils'

type Actions = {
  isTrue: boolean
  users: string[]
}

let store = createStore<Actions>({
  isTrue: true,
  users: []
})

let MyComponentRaw: React.StatelessComponent<{ store: Store<Actions> }> = ({ store }) =>
  <div>
    {store.get('isTrue') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue')(false)}>Update</button>
  </div>
MyComponentRaw.displayName = 'MyComponent'

let MyComponent = connect(store)(MyComponentRaw)

let MyComponentWithLens = connect(store)(({ store }) =>
  <div>
    {store.get('isTrue') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue')(!store.get('isTrue'))}>Update</button>
  </div>
)

test('[stateless] it should render a component', t =>
  withElement(MyComponentWithLens, _ =>
    t.regex(_.innerHTML, /True/)
  )
)

test('[stateless] it should update the component', t =>
  withElement(MyComponentWithLens, _ => {
    t.regex(_.innerHTML, /True/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  })
)

test('[stateless] it should not update the component if it has no lens', t =>
  withElement(MyComponent, _ => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  })
)

// nb: test order matters because store is shared!
test('[stateless] it should support lenses', t =>
  withElement(MyComponentWithLens, _ => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /True/)
  })
)

test('[stateless] it should support effects', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ => t.is(_, false))
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateless] it should call .on().subscribe() with the current value', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ =>
      t.is(_, true)
    )
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateless] it should call .onAll().subscribe() with the key, current value, and previous value', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(3)
    store.onAll().subscribe(_ => {
      t.is(_.key, 'isTrue')
      t.is(_.previousValue, true)
      t.is(_.value, false)
    })
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateless] it should only re-render if something actually changed', t => {

  let renderCount = 0
  let A = connect(store)(({ store }) => {
    renderCount++
    return <div>
      {store.get('isTrue') ? 'True' : 'False'}
      <button onClick={() => store.set('isTrue')(store.get('isTrue'))}>Update</button>
    </div>
  })

  withElement(A, _ => {
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    t.is(renderCount, 1)
  })
})

// There is room for perf optimization down the line.
// TODO: Add some benchmarks to see how bad this really is. Intuitively, it could
// cause app perf to degrade at least linearly as the app scales.
test('[stateless] it should re-render even if an unused model property changed', t => {

  let renderCount = 0
  let store = createStore({
    a: 1,
    b: 'x'
  })
  let A = connect(store)(({ store }) => {
    renderCount++
    return <div>{store.get('a')}</div>
  })

  withElement(A, _ => {
    store.set('b')('y')
    store.set('b')('z')
    t.is(renderCount, 3)
  })
})

test('[stateless] it should set a displayName', t =>
  t.is(MyComponent.displayName, 'withStore(MyComponent)')
)

test('[stateless] it should set a default displayName', t =>
  t.is(MyComponentWithLens.displayName, 'withStore(Component)')
)

test('[stateless] it should typecheck with additional props', t => {

  type Props = {
    foo: number
    bar: string
  }

  // Props should not include "store"
  let Foo = connect(store)<Props>(({ foo, store }) =>
    <div>
      {store.get('isTrue') ? 'True' : 'False'}
      <button onClick={() => store.set('isTrue')(false)}>Update</button>
    </div>
  )

  // We don't need to manually pass "store"
  let foo = <Foo foo={1} bar='baz' />

  t.pass()
})

test('#getState should return up to date state', t => {
  let A = connect(store)(({ store }) =>
    <div>
      {store.get('isTrue') ? 'True' : 'False'}
      <button onClick={() => store.set('isTrue')(!store.get('isTrue'))}>Update</button>
    </div>
  )

  withElement(A, _ => {
    t.deepEqual(store.getState(), { isTrue: false, users: [] })
    Simulate.click(_.querySelector('button')!)
    t.deepEqual(store.getState(), { isTrue: true, users: [] })
    Simulate.click(_.querySelector('button')!)
    t.deepEqual(store.getState(), { isTrue: false, users: [] })
    Simulate.click(_.querySelector('button')!)
    t.deepEqual(store.getState(), { isTrue: true, users: [] })
  })
})

test('#getState should not be writeable', t => {
  let A = connect(store)(({ store }) =>
    <div />
  )
  withElement(A, _ =>
    t.throws(() => (store.getState() as any).isTrue = false)
  )
})

test('[stateless] it should update correctly when using nested stores', t => {

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

  withElement(App, _ => {
    t.is(_.innerHTML, '<div>1-2</div>')
    storeA.set('a')(3)
    t.is(_.innerHTML, '<div>3-2</div>')
    storeB.set('b')(4)
    t.is(_.innerHTML, '<div>3-4</div>')
  })
})

test('[stateless] it should memoize setters', t =>
  withElement(MyComponentWithLens, _ => {
    t.is(store.set('isTrue'), store.set('isTrue'))
    t.is(store.set('users'), store.set('users'))
  })
)

test('[stateless] it should render with multiple stores', t => {

  let storeA = createStore({ a: 1 })
  let storeB = createStore({ b: 'c' })

  let Component = connectAs({
    a: storeA,
    b: storeB
  })(({ a, b }) =>
    <>
      a={a.get('a') * 4},
      b={b.get('b').concat('d')}
    </>
  )

  withElement(Component, _ =>
    t.is(_.innerHTML, 'a=4, b=cd')
  )

})

test('[stateless] it should update with multiple stores', t => {

  let storeA = createStore({ a: 1 })
  let storeB = createStore({ b: 'c' })

  let Component = connectAs({
    a: storeA,
    b: storeB
  })(({ a, b }) =>
    <>
      a={a.get('a') * 4},
      b={b.get('b').concat('d')}
      <button id='updateA' onClick={() => a.set('a')(a.get('a') + 10)} />
      <button id='updateB' onClick={() => b.set('b')(b.get('b').toUpperCase())} />
    </>
  )

  let buttons = '<button id="updateA"></button><button id="updateB"></button>'

  withElement(Component, _ => {
    t.is(_.innerHTML, 'a=4, b=cd' + buttons)
    Simulate.click(_.querySelector('#updateA')!)
    t.is(_.innerHTML, 'a=44, b=cd' + buttons)
    Simulate.click(_.querySelector('#updateA')!)
    t.is(_.innerHTML, 'a=84, b=cd' + buttons)
    Simulate.click(_.querySelector('#updateB')!)
    t.is(_.innerHTML, 'a=84, b=Cd' + buttons)
    storeB.set('b')('x')
    t.is(_.innerHTML, 'a=84, b=xd' + buttons)
    storeA.set('a')(50)
    t.is(_.innerHTML, 'a=200, b=xd' + buttons)
  })

})

test('[stateless] it should update when any of the stores updated', t => {

  let storeA = createStore({ a: 1 })
  let storeB = createStore({ b: 'c' })

  let renderCount = 0

  let Component = connectAs({
    a: storeA,
    b: storeB
  })(({ a, b }) => {
    renderCount++
    return <>
      a={a.get('a') * 4},
      b={b.get('b').concat('d')}
      <button id='updateA' onClick={() => a.set('a')(a.get('a') + 10)} />
      <button id='updateB' onClick={() => b.set('b')(b.get('b').toUpperCase())} />
    </>
  })

  let buttons = '<button id="updateA"></button><button id="updateB"></button>'

  withElement(Component, _ => {
    t.is(renderCount, 1)
    Simulate.click(_.querySelector('#updateA')!)
    Simulate.click(_.querySelector('#updateA')!)
    Simulate.click(_.querySelector('#updateB')!)
    storeB.set('b')('x')
    storeA.set('a')(50)
    t.is(renderCount, 6)
  })

})
