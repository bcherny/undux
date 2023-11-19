import test from 'ava'
import * as React from 'react'
import { act, Simulate } from 'react-dom/test-utils'
import { connect, connectAs, createStore, Store, StoreSnapshot } from '../src'
import { withElement } from './testUtils'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import '@testing-library/jest-dom'

type State = {
  isTrue: boolean
  users: string[]
}

let store = createStore<State>({
  isTrue: true,
  users: [],
})

type StoreProps = {
  store: Store<State>
}

let MyComponent = connect(store)(
  class MyComponent extends React.Component<StoreProps> {
    render() {
      return (
        <div>
          {this.props.store.get('isTrue') ? 'True' : 'False'}
          <button
            onClick={() => this.props.store.set('isTrue')(!store.get('isTrue'))}
          >
            Update
          </button>
        </div>
      )
    }
  },
)

test('[stateful] it should render a component', (t) =>
  withElement(MyComponent, (_) => t.regex(_.innerHTML, /True/)))

test('[stateful] it should update the component', (t) =>
  withElement(MyComponent, (_) => {
    t.regex(_.innerHTML, /True/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  }))

// nb: test order matters because store is shared!
test('[stateful] it should support lenses', (t) =>
  withElement(MyComponent, (_) => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /True/)
  }))

test('[stateful] it should support effects', async (t) => {
  t.plan(1)
  render(<MyComponent />)
  store.on('isTrue').subscribe((_) => t.is(_, false))
  await userEvent.click(screen.getByRole('button'))
})

test('[stateful] it should call .on().subscribe() with the current value', (t) =>
  withElement(MyComponent, (_) => {
    t.plan(1)
    store.on('isTrue').subscribe((_) => t.is(_, true))
    Simulate.click(_.querySelector('button')!)
  }))

test('[statelful] it should call .onAll().subscribe() with the key, current value, and previous value', (t) =>
  withElement(MyComponent, (_) => {
    t.plan(3)
    store.onAll().subscribe((_) => {
      t.is(_.key, 'isTrue')
      t.is(_.previousValue, true)
      t.is(_.value, false)
    })
    Simulate.click(_.querySelector('button')!)
  }))

test('[stateful] it should only re-render if something actually changed', (t) => {
  let renderCount = 0
  let A = connect(store)(
    class extends React.Component<StoreProps> {
      render() {
        renderCount++
        return (
          <div>
            {this.props.store.get('isTrue') ? 'True' : 'False'}
            <button
              onClick={() =>
                this.props.store.set('isTrue')(this.props.store.get('isTrue'))
              }
            >
              Update
            </button>
          </div>
        )
      }
    },
  )

  withElement(A, (_) => {
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    t.is(renderCount, 1)
  })
})

test('[stateful] it should set a displayName', (t) =>
  t.is(MyComponent.displayName, 'withStore(MyComponent)'))

test('[stateful] it should typecheck with additional props', (t) => {
  type Props2 = StoreProps & {
    foo: number
    bar: string
  }

  // Props should not include "store"
  let Foo = connect(store)<Props2>(
    class Foo extends React.Component<Props2> {
      render() {
        return (
          <div>
            {this.props.store.get('isTrue') ? 'True' : 'False'}
            {this.props.foo}
          </div>
        )
      }
    },
  )

  // We don't need to manually pass "store"
  let foo = <Foo foo={1} bar="baz" />

  t.pass()
})

test('[stateful] it should support lifecycle methods', (t) => {
  let renderCount = 0
  let updateCount = 0
  let store = createStore<State>({
    isTrue: true,
    users: [],
  })
  let A = connect(store)(
    class extends React.Component<StoreProps> {
      shouldComponentUpdate({ store }: StoreProps) {
        return store.get('users').length > 3
      }
      componentDidUpdate() {
        updateCount++
      }
      render() {
        renderCount++
        return (
          <div>
            {this.props.store.get('users').length > 3 ? 'FRESH' : 'STALE'}
            <button
              onClick={() =>
                this.props.store.set('users')(
                  this.props.store.get('users').concat('x'),
                )
              }
            >
              Update
            </button>
          </div>
        )
      }
    },
  )

  withElement(A, (_) => {
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /STALE/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /STALE/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /STALE/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /FRESH/)
    t.is(renderCount, 2)
    t.is(updateCount, 1)
  })
})

test('[stateful] it should update correctly when using nested stores', (t) => {
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

  let A = withStoreA(
    class extends React.Component<PropsA> {
      render() {
        return <B storeA={this.props.store} />
      }
    },
  )

  let B = withStoreB(
    class extends React.Component<PropsB> {
      render() {
        return (
          <div>
            {this.props.storeA.get('a')}-{this.props.store.get('b')}
          </div>
        )
      }
    },
  )

  class App extends React.Component {
    render() {
      return <A />
    }
  }

  withElement(App, (_) => {
    t.is(_.innerHTML, '<div>1-2</div>')
    storeA.set('a')(3)
    t.is(_.innerHTML, '<div>3-2</div>')
    storeB.set('b')(4)
    t.is(_.innerHTML, '<div>3-4</div>')
  })
})

test('[stateful] it should memoize setters', (t) =>
  withElement(MyComponent, (_) => {
    t.is(store.set('isTrue'), store.set('isTrue'))
    t.is(store.set('users'), store.set('users'))
  }))

test('[stateful] it should render with multiple stores', (t) => {
  type A = { a: number }
  type B = { b: string }

  let storeA = createStore<A>({ a: 1 })
  let storeB = createStore<B>({ b: 'c' })

  type Props = {
    a: StoreSnapshot<A>
    b: StoreSnapshot<B>
  }

  class Component extends React.Component<Props> {
    render() {
      return (
        <>
          a={this.props.a.get('a') * 4}, b={this.props.b.get('b').concat('d')}
        </>
      )
    }
  }

  let ConnectedComponent = connectAs({
    a: storeA,
    b: storeB,
  })(Component)

  withElement(ConnectedComponent, (_) => t.is(_.innerHTML, 'a=4, b=cd'))
})

test('[stateful] it should update with multiple stores', (t) => {
  type A = { a: number }
  type B = { b: string }
  type C = { c: { d: boolean } }

  let storeA = createStore<A>({ a: 1 })
  let storeB = createStore<B>({ b: 'c' })
  let storeC = createStore<C>({ c: { d: true } })

  type Props = {
    a: StoreSnapshot<A>
    b: StoreSnapshot<B>
    c: StoreSnapshot<C>
  }

  let Component = connectAs({
    a: storeA,
    b: storeB,
    c: storeC,
  })(
    class extends React.Component<Props> {
      render() {
        return (
          <>
            a={this.props.a.get('a') * 4}, b={this.props.b.get('b').concat('d')}
            , c={this.props.c.get('c').d.toString()}
            <button
              id="updateA"
              onClick={() => this.props.a.set('a')(this.props.a.get('a') + 10)}
            />
            <button
              id="updateB"
              onClick={() =>
                this.props.b.set('b')(this.props.b.get('b').toUpperCase())
              }
            />
            <button
              id="updateC"
              onClick={() =>
                this.props.c.set('c')({ d: !this.props.c.get('c').d })
              }
            />
          </>
        )
      }
    },
  )

  let buttons =
    '<button id="updateA"></button><button id="updateB"></button><button id="updateC"></button>'

  withElement(Component, (_) => {
    t.is(_.innerHTML, 'a=4, b=cd, c=true' + buttons)
    Simulate.click(_.querySelector('#updateA')!)
    t.is(_.innerHTML, 'a=44, b=cd, c=true' + buttons)
    Simulate.click(_.querySelector('#updateA')!)
    t.is(_.innerHTML, 'a=84, b=cd, c=true' + buttons)
    Simulate.click(_.querySelector('#updateB')!)
    t.is(_.innerHTML, 'a=84, b=Cd, c=true' + buttons)
    storeB.set('b')('x')
    t.is(_.innerHTML, 'a=84, b=xd, c=true' + buttons)
    storeA.set('a')(50)
    t.is(_.innerHTML, 'a=200, b=xd, c=true' + buttons)
    Simulate.click(_.querySelector('#updateC')!)
    t.is(_.innerHTML, 'a=200, b=xd, c=false' + buttons)
  })
})

test('[stateful] it should update when any of the stores updated', (t) => {
  type A = { a: number }
  type B = { b: string }

  let storeA = createStore<A>({ a: 1 })
  let storeB = createStore<B>({ b: 'c' })

  type Props = {
    a: StoreSnapshot<A>
    b: StoreSnapshot<B>
  }

  let renderCount = 0

  let Component = connectAs({
    a: storeA,
    b: storeB,
  })(
    class extends React.Component<Props> {
      render() {
        renderCount++
        return (
          <>
            a={this.props.a.get('a') * 4}, b={this.props.b.get('b').concat('d')}
            <button
              id="updateA"
              onClick={() => this.props.a.set('a')(this.props.a.get('a') + 10)}
            />
            <button
              id="updateB"
              onClick={() =>
                this.props.b.set('b')(this.props.b.get('b').toUpperCase())
              }
            />
          </>
        )
      }
    },
  )

  withElement(Component, (_) => {
    t.is(renderCount, 1)
    Simulate.click(_.querySelector('#updateA')!)
    Simulate.click(_.querySelector('#updateA')!)
    Simulate.click(_.querySelector('#updateB')!)
    storeB.set('b')('x')
    storeA.set('a')(50)
    t.is(renderCount, 6)
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
  a: Store<CombinedA>
  b: Store<CombinedB>
}

type ConnectedCombinedAugmentedProps = CombinedComponentProps & {
  x: number
}

/// Class component

class CombinedComponent10 extends React.Component<CombinedComponentProps> {
  render() {
    return (
      <div>
        {this.props.a.get('a') * 4}
        {this.props.b.get('b').concat('d')}
      </div>
    )
  }
}

let ConnectedCombinedComponent10 = connectAs({
  a: storeA,
  b: storeB,
})(CombinedComponent10)

let ca10 = <ConnectedCombinedComponent10 />

/// Class component (additional props)

class CombinedComponent11 extends React.Component<ConnectedCombinedAugmentedProps> {
  render() {
    return (
      <div>
        {this.props.a.get('a') * 4}
        {this.props.b.get('b').concat('d')}
        {this.props.x * 3}
      </div>
    )
  }
}

let ConnectedCombinedComponent11 = connectAs({
  a: storeA,
  b: storeB,
})(CombinedComponent11)

let ca11 = <ConnectedCombinedComponent11 x={3} />

/// Class component (inline)

let ConnectedCombinedComponent12 = connectAs({
  a: storeA,
  b: storeB,
})(
  class extends React.Component<CombinedComponentProps> {
    render() {
      return (
        <div>
          {this.props.a.get('a') * 4}
          {this.props.b.get('b').concat('d')}
        </div>
      )
    }
  },
)

let ca12 = <ConnectedCombinedComponent12 />

/// Class component (inline, additional props)

let ConnectedCombinedComponent13 = connectAs({
  a: storeA,
  b: storeB,
})(
  class extends React.Component<ConnectedCombinedAugmentedProps> {
    render() {
      return (
        <div>
          {this.props.a.get('a') * 13}
          {this.props.b.get('b').concat('d')}
          {this.props.x * 3}
        </div>
      )
    }
  },
)

let ca13 = <ConnectedCombinedComponent13 x={4} />
