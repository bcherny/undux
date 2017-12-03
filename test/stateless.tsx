import * as React from 'react'
import { connect, createStore, Store } from '../src'
import { Simulate } from 'react-dom/test-utils'
import { test } from 'ava'
import { withElement } from './util'

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

let MyComponent = connect(store)()(MyComponentRaw)

let MyComponentWithLens = connect(store)('isTrue')(({ store }) =>
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

test('[stateless] it should call .beforeAll().subscribe() with the key, current value, and previous value', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(1)
    store.beforeAll().subscribe(_ =>
      t.deepEqual(_, { key: 'isTrue', previousValue: false, value: true })
    )
    Simulate.click(_.querySelector('button')!)
  })
)

test('[stateless] it should call .before().subscribe() with the key, current value, and previous value', t =>
  withElement(MyComponentWithLens, _ => {
    t.plan(1)
    store.before('isTrue').subscribe(_ =>
      t.deepEqual(_, { key: 'isTrue', previousValue: true, value: false })
    )
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

test('[stateless] it should only re-render if something actually changed', t => {

  let renderCount = 0
  let A = connect(store)('isTrue')(({ store }) => {
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

test('[stateless] it should set a displayName', t =>
  t.is(MyComponent.displayName, 'withStore(MyComponent)')
)

test('[stateless] it should set a default displayName', t =>
  t.is(MyComponentWithLens.displayName, 'withStore(Component)')
)