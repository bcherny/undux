import * as React from 'react'
import { connect, createStore } from '../src'
import { Simulate } from 'react-dom/test-utils'
import { render, unmountComponentAtNode } from 'react-dom'
import { test, TestContext } from 'ava'
import { JSDOM } from 'jsdom'

type Store = {
  isTrue: boolean
  users: string[]
}

let store = createStore<Store>({
  isTrue: true,
  users: []
})

let MyComponent = connect(store)(({ store }) =>
  <div>
    {store.get('isTrue') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue', false)}>Update</button>
  </div>
)

let MyComponentWithLens1 = connect(store, ['isTrue'])(({ store }) =>
  <div>
    {store.get('isTrue') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue', !store.get('isTrue'))}>Update</button>
  </div>
)

test('it should render a component', t =>
  withElement(MyComponent, _ =>
    t.regex(_.innerHTML, /True/)
  )
)

test('it should update the component', t =>
  withElement(MyComponent, _ => {
    t.regex(_.innerHTML, /True/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /False/)
  })
)

// nb: test order matters because store is shared!
test('it should support lenses', t =>
  withElement(MyComponentWithLens1, _ => {
    t.regex(_.innerHTML, /False/)
    Simulate.click(_.querySelector('button')!)
    t.regex(_.innerHTML, /True/)
  })
)

test('it should support effects', t =>
  withElement(MyComponentWithLens1, _ => {
    t.plan(1)
    store.on('isTrue').subscribe(_ => t.is(_, false))
    Simulate.click(_.querySelector('button')!)
  })
)

function withElement(Component: React.ComponentClass, f: (div: HTMLDivElement) => void) {
  let { window: { document } } = new JSDOM
  let div = document.createElement('div')
  render(<Component />, div)
  f(div)
  unmountComponentAtNode(div)
}
