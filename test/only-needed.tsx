import { test } from 'ava'
import * as I from 'immutable'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { connect, createStore, Store } from '../src'
import { withElement } from './testUtils'

interface AppStore {
  fruits: I.Map<string, number>,
  counter: number
}

const initialFruits = {
  banana: 100
}

const store = createStore<AppStore>({
  fruits: I.Map(initialFruits),
  counter: 0
})

const withStore = connect(store)

test('[only-needed] get depends on other get works', t => {
  let renderCount = 0

  const TestingComponent = withStore(({ store }) => {

    const incrCounter = () => store.set('counter')(store.get('counter') + 1)
    const decrCounter = () => store.set('counter')(store.get('counter') - 1)

    renderCount++
    return (
      <div>
        <button id="incr" onClick={incrCounter}>Incr</button>
        <button id="decr" onClick={decrCounter}>Decr</button>
        {store.get('counter') > 0 ?
          <div>{store.get('fruits').get('banana')}</div>
          : <span/>
        }
      </div>
    )
  })

  withElement(TestingComponent, _ => {
    Simulate.click(_.querySelector('#incr')!)
    t.is(store.get('counter'), 1)
    Simulate.click(_.querySelector('#decr')!)
    t.is(store.get('counter'), 0)
    store.set('fruits')(I.Map({banana: 200}))
    t.is(renderCount, 4) // Initial + Incr + Decr + setFruits
  })
})
