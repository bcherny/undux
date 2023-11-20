import * as React from 'react'
import { createConnectedStore } from '../../src'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('createConnectedStore (context)', () => {
  test('it should expose a hooks API', () => {
    let S = createConnectedStore({ a: 1 })
    let A = () => {
      let store = S.useStore()
      return (
        <button onClick={() => store.set('a')(store.get('a') + 1)}>
          {store.get('a')}
        </button>
      )
    }
    let { getByRole } = render(
      <S.Container>
        <A />
      </S.Container>,
    )
    expect(getByRole('button').innerHTML).toBe('1')
    fireEvent.click(getByRole('button'))
    expect(getByRole('button').innerHTML).toBe('2')
  })

  test("it should throw if you don't give it a Provider", () => {
    let S = createConnectedStore({ a: 1 })
    let A = () => {
      let store = S.useStore()
      return <>{store.get('a')}</>
    }
    expect(() => render(<A />)).toThrow(/store.get is not a function/)
  })
})
