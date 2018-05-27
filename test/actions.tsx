import { test } from 'ava'
import * as React from 'react'
import { createStoreWithActions } from '../src'

test('actions', t => {
  type Actions = {
    SHOULD_SET_A: number,
    SHOULD_SET_B: string
  }
  type State = {
    a: number,
    b: string
  }
  let store = createStoreWithActions<State, Actions>({
    a: 1,
    b: 'b'
  })

  store
    .react('SHOULD_SET_A')
    .subscribe(store.set('a'))

  store
    .on('a')
    .subscribe(a => console.log(a * 1000))

  store
    .act('SHOULD_SET_A')(10)
})
