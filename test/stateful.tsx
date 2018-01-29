import { test } from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connect, createStore, Store } from '../src'
import { withElement } from './util'

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

let MyComponent = connect(store)()(
  class MyComponent extends React.Component<Props> {
    render() {
      return <div>
        {this.props.store.get('isTrue') ? 'True' : 'False'}
        <button onClick={() => this.props.store.set('isTrue')(false)}>Update</button>
      </div>
    }
  }
)

let MyComponentWithLens = connect(store)('isTrue')(
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

test('[stateful] it should call .beforeAll().subscribe() with the key, current value, and previous value', t =>
withElement(MyComponentWithLens, _ => {
  t.plan(1)
  store.beforeAll().subscribe(_ =>
    t.deepEqual(_, { key: 'isTrue', previousValue: false, value: true })
  )
  Simulate.click(_.querySelector('button')!)
})
)

test('[stateful] it should call .before().subscribe() with the key, current value, and previous value', t =>
withElement(MyComponentWithLens, _ => {
  t.plan(1)
  store.before('isTrue').subscribe(_ =>
    t.deepEqual(_, { key: 'isTrue', previousValue: true, value: false })
  )
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

test('[stateful] it should only re-render if something actually changed', t => {

  let renderCount = 0
  let A = connect(store)()(
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
  let Foo = connect(store)()<Props2>(class Foo extends React.Component<Props2> {
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
