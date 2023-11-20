import * as React from 'react'
import { createConnectedStoreAs } from '../../src'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('createConnectedStoreAs (context)', () => {
  test('it should expose a hooks API (createConnectedStoreAs)', () => {
    let S = createConnectedStoreAs({ a: { b: 1 } })
    let A = () => {
      let stores = S.useStores()
      return (
        <button onClick={() => stores.a.set('b')(stores.a.get('b') + 1)}>
          {stores.a.get('b')}
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

  test("it should throw if you don't give it a Provider (createConnectedStoreAs)", () => {
    let S = createConnectedStoreAs({ a: { b: 1 } })
    let A = () => {
      let stores = S.useStores()
      return <>{stores.a.get('b')}</>
    }
    expect(() => render(<A />)).toThrow(
      "Cannot read properties of undefined (reading 'get')",
    )
  })
})
