import * as I from 'immutable'
import * as React from 'react'
import { connect, createStore } from '../src'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('immutable', () => {
  interface AppStore {
    fruits: I.Map<string, number>
  }

  const initialFruits = {
    banana: 100,
  }

  const store = createStore<AppStore>({
    fruits: I.Map(initialFruits),
  })

  const withStore = connect(store)

  test('it should only re-render if something actually changed', () => {
    let renderCount = 0

    const TestingComponent = withStore(({ store }) => {
      const fruits = store.get('fruits')
      const updateBanana = () => store.set('fruits')(I.Map(initialFruits))

      renderCount++
      return (
        <div>
          <button onClick={updateBanana}>Update</button>
          <div>{fruits.get('banana')}</div>
        </div>
      )
    })

    render(<TestingComponent />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(renderCount).toBe(1)
  })
})
