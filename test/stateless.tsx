import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connect, connectAs, createStore, Store } from '../src'
import { withElement } from './testUtils'

type State = {
  isTrue: boolean
  users: string[]
}

let store = createStore<State>({
  isTrue: true,
  users: []
})

type StoreProps = {
  store: Store<State>
}

let MyDumbComponent: React.StatelessComponent<StoreProps> = ({ store }) =>
  <div>
    {store.get('isTrue') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue')(!store.get('isTrue'))}>Update</button>
  </div>
MyDumbComponent.displayName = 'MyComponent'

let MyComponent = connect(store)(MyDumbComponent)

test('[stateless] it should render a component', t =>
  withElement(MyComponent, _ =>
    t.regex(_.innerHTML, /True/)
  )
)

test('[stateless] it should update the component', t =>
  withElement(MyComponent, _ => {
    t.regex(_.innerHTML, /True/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  })
)

// nb: test order matters because store is shared!
test('[stateless] it should support lenses', t =>
  withElement(MyComponent, _ => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /True/)
  })
)

test('[stateless] it should support effects', t =>
  withElement(MyComponent, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ => t.is(_, false))
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateless] it should call .on().subscribe() with the current value', t =>
  withElement(MyComponent, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ =>
      t.is(_, true)
    )
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateless] it should call .onAll().subscribe() with the key, current value, and previous value', t =>
  withElement(MyComponent, _ => {
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

test('[stateless] it should not re-render if an unused model property changed', t => {

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
    t.is(renderCount, 1)
  })
})

test('[stateless] it should set a displayName', t =>
  t.is(MyComponent.displayName, 'withStore(MyComponent)')
)

test('[stateless] it should set a default displayName', t =>
  t.is(connect(store)(() => <div />).displayName, 'withStore(Component)')
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
  withElement(MyComponent, _ => {
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

test('[stateless] it should update when a get() that depends on a get() renders', t => {
  let renderCount = 0

  let store = createStore({
    counter: 0,
    fruits: {
      banana: 100
    }
  })
  let withStore = connect(store)

  const C = withStore(({ store }) => {

    const incrCounter = () => store.set('counter')(store.get('counter') + 1)
    const decrCounter = () => store.set('counter')(store.get('counter') - 1)

    renderCount++
    return (
      <div>
        <button id='incr' onClick={incrCounter}>Incr</button>
        <button id='decr' onClick={decrCounter}>Decr</button>
        {store.get('counter') > 0 ?
          <div>{store.get('fruits').banana}</div>
          : <span/>
        }
      </div>
    )
  })

  withElement(C, _ => {
    Simulate.click(_.querySelector('#incr')!)
    t.is(store.get('counter'), 1)
    Simulate.click(_.querySelector('#decr')!)
    t.is(store.get('counter'), 0)
    store.set('fruits')({banana: 200})
    t.is(renderCount, 4) // Initial + Incr + Decr + setFruits
  })
})

test('[stateful] it should update only when subscribed fields change (get)', t => {
  let store = createStore({
    a: 0,
    b: 'foo'
  })
  let renderCount = 0
  type Props = {
    store: Store<{a: number, b: string }>
  }
  let A = connect(store)(class extends React.Component<Props> {
    render() {
      renderCount++
      return <>
        {this.props.store.get('a')}
        <button id='a' onClick={() => this.props.store.set('a')(this.props.store.get('a') + 1)} />
        <button id='b' onClick={() => this.props.store.set('a')(this.props.store.get('a') - 1)} />
        {this.props.store.get('a') > 0
          ? <div>{this.props.store.get('b')}</div>
          : <span />
        }
      </>
    }
  })
  withElement(A, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0<button id="a"></button><button id="b"></button><span></span>')
    Simulate.click(_.querySelector('#a')!) // Render
    t.is(_.innerHTML, '1<button id="a"></button><button id="b"></button><div>bar</div>')
    Simulate.click(_.querySelector('#b')!) // Render
    t.is(_.innerHTML, '0<button id="a"></button><button id="b"></button><span></span>')
    store.set('b')('baz') // Render
    t.is(_.innerHTML, '0<button id="a"></button><button id="b"></button><span></span>')
    t.is(renderCount, 4)
  })
})

test('[stateful] it should update only when subscribed fields change (get in lifecycle)', t => {
  let store = createStore({
    a: 0,
    b: 'foo'
  })
  let renderCount = 0
  type Props = {
    store: Store<{a: number, b: string }>
  }
  let A = connect(store)(class extends React.Component<Props> {
    shouldComponentUpdate(p: Props) {
      return p.store.get('b') !== this.props.store.get('b') || true
    }
    render() {
      renderCount++
      return <>
        {this.props.store.get('a')}
        {this.props.store.get('a') > 0
          ? <div>{this.props.store.get('b')}</div>
          : <span />
        }
      </>
    }
  })
  withElement(A, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0<span></span>')
    store.set('a')(1) // Render, and trigger shouldComponentUpdate
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 4)
  })
})

test('[stateful] it should update only when subscribed fields change (getState in lifecycle 1)', t => {
  let store = createStore({
    a: 0,
    b: 'foo'
  })
  let renderCount = 0
  type Props = {
    store: Store<{a: number, b: string }>
  }
  let A = connect(store)(class extends React.Component<Props> {
    shouldComponentUpdate(p: Props) {
      return p.store.getState().b !== this.props.store.get('b') || true
    }
    render() {
      renderCount++
      return this.props.store.get('a')
    }
  })
  withElement(A, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0')
    store.set('a')(1) // Render, and trigger shouldComponentUpdate
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 4)
  })
})

test('[stateful] it should update only when subscribed fields change (getState in lifecycle 2)', t => {
  let store = createStore({
    a: 0,
    b: 'foo'
  })
  let renderCount = 0
  type Props = {
    store: Store<{a: number, b: string }>
  }
  let A = connect(store)(class extends React.Component<Props> {
    shouldComponentUpdate(p: Props) {
      return p.store.get('b') !== this.props.store.getState().b || true
    }
    render() {
      renderCount++
      return this.props.store.get('a')
    }
  })
  withElement(A, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0')
    store.set('a')(1) // Render, and trigger shouldComponentUpdate
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 4)
  })
})

test('[stateful] it should update only when subscribed fields change (get in constructor)', t => {
  let store = createStore({
    a: 0,
    b: 'foo'
  })
  let renderCount = 0
  type Props = {
    store: Store<{a: number, b: string }>
  }
  let A = connect(store)(class extends React.Component<Props> {
    constructor(p: Props) {
      super(p)
      let _ = this.props.store.get('b') // Trigger read
    }
    render() {
      renderCount++
      return <>
        {this.props.store.get('a')}
        {this.props.store.get('a') > 0
          ? <div>{this.props.store.get('b')}</div>
          : <span />
        }
      </>
    }
  })
  withElement(A, _ => {
    store.set('b')('bar') // Render
    t.is(_.innerHTML, '0<span></span>')
    store.set('a')(1) // Render
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 5)
  })
})

test('[stateful] it should update only when subscribed fields change (set in constructor)', t => {
  let store = createStore({
    a: 0
  })
  let renderCount = 0
  type Props = {
    store: typeof store
  }
  let A = connect(store)(class extends React.Component<Props> {
    constructor(p: Props) {
      super(p)
      this.props.store.set('a')(1)
    }
    render() {
      renderCount++
      return <>
        {this.props.store.get('a')}
      </>
    }
  })
  withElement(A, _ => {
    t.is(_.innerHTML, '1')
    t.is(renderCount, 2)
  })
})

test('[stateful] it should update when any field changes (getState)', t => {
  let store = createStore({
    a: 0,
    b: 'foo'
  })
  let renderCount = 0
  type Props = {
    store: Store<{a: number, b: string }>
  }
  let A = connect(store)(class extends React.Component<Props> {
    render() {
      renderCount++
      return <>
        {this.props.store.getState().a}
        <button id='a' onClick={() => this.props.store.set('a')(this.props.store.get('a') + 1)} />
        <button id='b' onClick={() => this.props.store.set('a')(this.props.store.get('a') - 1)} />
        {this.props.store.get('a') > 0
          ? <div>{this.props.store.get('b')}</div>
          : <span />
        }
      </>
    }
  })
  withElement(A, _ => {
    store.set('b')('bar') // Render (this is the deoptimization when you use .getState)
    t.is(_.innerHTML, '0<button id="a"></button><button id="b"></button><span></span>')
    Simulate.click(_.querySelector('#a')!) // Render
    t.is(_.innerHTML, '1<button id="a"></button><button id="b"></button><div>bar</div>')
    Simulate.click(_.querySelector('#b')!) // Render
    t.is(_.innerHTML, '0<button id="a"></button><button id="b"></button><span></span>')
    store.set('b')('baz') // Render
    t.is(_.innerHTML, '0<button id="a"></button><button id="b"></button><span></span>')
    t.is(renderCount, 5)
  })
})

//
// Compilation tests
// All of the following should compile:
//

type CombinedA = { a: number }
type CombinedB = { b: string }

let initA: CombinedA = { a: 1 }
let initB: CombinedB = { b: 'c' }

let storeA = createStore(initA)
let storeB = createStore(initB)

type CombinedComponentProps = {
  a: Store<CombinedA>,
  b: Store<CombinedB>
}

type ConnectedCombinedAugmentedProps = CombinedComponentProps & {
  x: number
}

//// Functional component

let CombinedComponent = ({a, b}: CombinedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
  </div>

let ConnectedCombinedComponent = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent)

let ca = <ConnectedCombinedComponent />

//// Functional component (additional props)

let CombinedComponent1 = ({a, b, x}: ConnectedCombinedAugmentedProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
    {x * 3}
  </div>

let ConnectedCombinedComponent1 = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent1)

let ca1 = <ConnectedCombinedComponent1 x={3} />

//// Functional component (inline)

let ConnectedCombinedComponent2 = connectAs({
  a: storeA,
  b: storeB
})(({a, b}: CombinedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
  </div>
)

let ca2 = <ConnectedCombinedComponent2 />

//// Functional component (inline, additional props)

let ConnectedCombinedComponent3 = connectAs({
  a: storeA,
  b: storeB
})(({a, b, x}: ConnectedCombinedAugmentedProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
    {x * 3}
  </div>
)

let ca3 = <ConnectedCombinedComponent3 x={3} />
