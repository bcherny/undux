import { test } from 'ava'
import * as I from 'immutable'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connect, createStore, Store } from '../src'
import { withElement } from './testUtils'

interface AppStore {
  fruits: I.Map<string, number>
}

const initialFruits = {
  banana: 100
}

const store = createStore<AppStore>({
  fruits: I.Map(initialFruits)
})

const withStore = connect(store)

test('[immutable] it should only re-render if something actually changed', t => {
  let renderCount = 0

  const TestingComponent = withStore('fruits')(({ store }) => {
    const fruits = store.get('fruits')
    const updateBanana = () =>
      store.set('fruits')(I.Map(initialFruits))

    renderCount++
    return (
      <div>
        <button onClick={updateBanana}>Update</button>
        <div>{fruits.get('banana')}</div>
      </div>
    )
  })

  withElement(TestingComponent, _ => {
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    Simulate.click(_.querySelector('button')!)
    t.is(renderCount, 1)
  })
})
