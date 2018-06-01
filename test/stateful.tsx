import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connect, connectAs, createStore, Store, StoreSnapshot } from '../src'
import { withElement } from './testUtils'

type Actions = {
  isTrue: boolean
  users: string[]
}

let store = createStore<Actions>({
  isTrue: true,
  users: []
})

type Props = {
  store: Store<Actions>
}

let MyComponent = connect(store)(
  class MyComponent extends React.Component<Props> {
    render() {
      return <div>
        {this.props.store.get('isTrue') ? 'True' : 'False'}
        <button onClick={() => this.props.store.set('isTrue')(false)}>Update</button>
      </div>
    }
  }
)

let MyComponentWithLens = connect(store)(
  class MyComponentWithLens extends React.Component<Props> {
    render() {
      return <div>
        {this.props.store.get('isTrue') ? 'True' : 'False'}
        <button onClick={() => this.props.store.set('isTrue')(!store.get('isTrue'))}>Update</button>
      </div>
    }
  }
)

test('[stateful] it should render a component', t =>
  withElement(MyComponentWithLens, _ =>
    t.regex(_.innerHTML, /True/)
  )
)

test('[stateful] it should update the component', t =>
  withElement(MyComponentWithLens, _ => {
    t.regex(_.innerHTML, /True/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  })
)

test('[stateful] it should not update the component if it has no lens', t =>
  withElement(MyComponent, _ => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  })
)

// nb: test order matters because store is shared!
test('[stateful] it should support lenses', t =>
  withElement(MyComponentWithLens, _ => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /True/)
  })
)

test('[stateful] it should support effects', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ => t.is(_, false))
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateful] it should call .on().subscribe() with the current value', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ =>
      t.is(_, true)
    )
    Simulate.click(_.querySelector('button')!)
  })
)

test('[statelful] it should call .onAll().subscribe() with the key, current value, and previous value', t =>
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

test('[stateful] it should only re-render if something actually changed', t => {

  let renderCount = 0
  let A = connect(store)(
    class extends React.Component<Props> {
      render() {
        renderCount++
        return <div>
          {this.props.store.get('isTrue') ? 'True' : 'False'}
          <button onClick={() => this.props.store.set('isTrue')(this.props.store.get('isTrue'))}>Update</button>
        </div>
      }
    }
  )

  withElement(A, _ => {
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    t.is(renderCount, 1)
  })
})

test('[stateful] it should set a displayName', t =>
  t.is(MyComponent.displayName, 'withStore(MyComponent)')
)

test('[stateful] it should typecheck with additional props', t => {

  type Props2 = Props & {
    foo: number
    bar: string
  }

  // Props should not include "store"
  let Foo = connect(store)<Props2>(class Foo extends React.Component<Props2> {
    render() {
      return <div>
        {this.props.store.get('isTrue') ? 'True' : 'False'}
        {this.props.foo}
      </div>
    }
  })

  // We don't need to manually pass "store"
  let foo = <Foo foo={1} bar='baz' />

  t.pass()
})

test('[stateful] it should support lifecycle methods', t => {

  let renderCount = 0
  let updateCount = 0
  let willReceivePropsCount = 0
  let store = createStore<Actions>({
    isTrue: true,
    users: []
  })
  let A = connect(store)(
    class extends React.Component<Props> {
      shouldComponentUpdate({ store }: Props) {
        return store.get('users').length > 3
      }
      componentDidUpdate() {
        updateCount++
      }
      componentWillReceiveProps() {
        willReceivePropsCount++
      }
      render() {
        renderCount++
        return <div>
          {this.props.store.get('users').length > 3 ? 'FRESH' : 'STALE'}
          <button onClick={() =>
            this.props.store.set('users')(this.props.store.get('users').concat('x'))
          }>Update</button>
        </div>
      }
    }
  )

  withElement(A, _ => {
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
    t.is(willReceivePropsCount, 4)
  })
})

test('[stateful] it should update correctly when using nested stores', t => {

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

  let A = withStoreA(class extends React.Component<PropsA> {
    render() {
      return <B storeA={this.props.store} />
    }
  })

  let B = withStoreB(class extends React.Component<PropsB> {
    render() {
      return <div>{this.props.storeA.get('a')}-{this.props.store.get('b')}</div>
    }
  })

  class App extends React.Component {
    render() {
      return <A />
    }
  }

  withElement(App, _ => {
    t.is(_.innerHTML, '<div>1-2</div>')
    storeA.set('a')(3)
    t.is(_.innerHTML, '<div>3-2</div>')
    storeB.set('b')(4)
    t.is(_.innerHTML, '<div>3-4</div>')
  })
})

test('[stateful] it should memoize setters', t =>
  withElement(MyComponentWithLens, _ => {
    t.is(store.set('isTrue'), store.set('isTrue'))
    t.is(store.set('users'), store.set('users'))
  })
)

test('[stateful] it should render with multiple stores', t => {

  type A = { a: number}
  type B = { b: string }

  let storeA = createStore<A>({ a: 1 })
  let storeB = createStore<B>({ b: 'c' })

  type Props = {
    a: StoreSnapshot<A>,
    b: StoreSnapshot<B>
  }

  class Component extends React.Component<Props> {
    render(){
      return <>
        a={this.props.a.get('a') * 4},
        b={this.props.b.get('b').concat('d')}
      </>
    }
  }

  let ConnectedComponent = connectAs({
    a: storeA,
    b: storeB
  })(Component)

  withElement(ConnectedComponent, _ =>
    t.is(_.innerHTML, 'a=4, b=cd')
  )

})

test('[stateful] it should update with multiple stores', t => {

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

test('[stateful] it should update when any of the stores updated', t => {

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
