import * as React from 'react'
import { EffectsAs } from '../../src'
import { createConnectedStoreAs } from '../../src/react'
import { fireEvent, render, within } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('createConnectedStoreAs', () => {
  test('it should support combining stores', () => {
    let C = createConnectedStoreAs({
      A: { a: 1 },
      B: { b: 1 },
    })

    let X = C.withStores(({ A, B }) => (
      <>
        <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
        <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
      </>
    ))

    let { getAllByRole } = render(
      <C.Container>
        <X />
      </C.Container>,
    )

    expect(getAllByRole('button')[0].innerHTML).toBe('1')
    expect(getAllByRole('button')[1].innerHTML).toBe('1')

    fireEvent.click(getAllByRole('button')[0])
    expect(getAllByRole('button')[0].innerHTML).toBe('2')
    expect(getAllByRole('button')[1].innerHTML).toBe('1')

    fireEvent.click(getAllByRole('button')[1])
    expect(getAllByRole('button')[0].innerHTML).toBe('2')
    expect(getAllByRole('button')[1].innerHTML).toBe('2')

    fireEvent.click(getAllByRole('button')[0])
    expect(getAllByRole('button')[0].innerHTML).toBe('3')
    expect(getAllByRole('button')[1].innerHTML).toBe('2')
  })

  test('it should support effects for multiple stores', () => {
    type State = {
      A: { a: number }
      B: { b: number }
    }

    let withEffects: EffectsAs<State> = ({ A, B }) => {
      A.on('a').subscribe((a) => expect(a).toBe(2))
      B.on('b').subscribe((b) => expect(b).toBe(2))
      return { A, B }
    }

    let C = createConnectedStoreAs(
      {
        A: { a: 1 },
        B: { b: 1 },
      },
      withEffects,
    )

    let X = C.withStores(({ A, B }) => (
      <>
        <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
        <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
      </>
    ))

    let { getAllByRole } = render(
      <C.Container>
        <X />
      </C.Container>,
    )

    fireEvent.click(getAllByRole('button')[0])
    fireEvent.click(getAllByRole('button')[1])
  })

  test('it should support multiple instances of multiple stores', () => {
    let { Container, withStores } = createConnectedStoreAs({
      A: { a: 1 },
      B: { b: 2 },
    })
    let C = withStores(({ A, B }) => (
      <>
        <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
        <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
      </>
    ))

    let { getByTestId } = render(
      <>
        <div data-testid="A">
          <Container>
            <C />
          </Container>
        </div>
        <div data-testid="B">
          <Container>
            <C />
          </Container>
        </div>
      </>,
    )

    let A = within(getByTestId('A'))
    let B = within(getByTestId('B'))

    expect(A.getAllByRole('button')[0].innerHTML).toBe('1')
    expect(A.getAllByRole('button')[1].innerHTML).toBe('2')
    expect(B.getAllByRole('button')[0].innerHTML).toBe('1')
    expect(B.getAllByRole('button')[1].innerHTML).toBe('2')

    fireEvent.click(A.getAllByRole('button')[0])
    expect(A.getAllByRole('button')[0].innerHTML).toBe('2')
    expect(A.getAllByRole('button')[1].innerHTML).toBe('2')
    expect(B.getAllByRole('button')[0].innerHTML).toBe('1')
    expect(B.getAllByRole('button')[1].innerHTML).toBe('2')

    fireEvent.click(B.getAllByRole('button')[0])
    expect(A.getAllByRole('button')[0].innerHTML).toBe('2')
    expect(A.getAllByRole('button')[1].innerHTML).toBe('2')
    expect(B.getAllByRole('button')[0].innerHTML).toBe('2')
    expect(B.getAllByRole('button')[1].innerHTML).toBe('2')

    fireEvent.click(B.getAllByRole('button')[1])
    expect(A.getAllByRole('button')[0].innerHTML).toBe('2')
    expect(A.getAllByRole('button')[1].innerHTML).toBe('2')
    expect(B.getAllByRole('button')[0].innerHTML).toBe('2')
    expect(B.getAllByRole('button')[1].innerHTML).toBe('3')
  })

  test('it should support custom initialStates for multiple stores', () => {
    let C = createConnectedStoreAs({
      A: { a: 1 },
      B: { b: 1 },
    })

    let X = C.withStores(({ A, B }) => (
      <>
        <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
        <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
      </>
    ))

    let initialStates = {
      A: { a: 3 },
      B: { b: 4 },
    }

    let { getAllByRole } = render(
      <C.Container initialStates={initialStates}>
        <X />
      </C.Container>,
    )

    expect(getAllByRole('button')[0].innerHTML).toBe('3')
    expect(getAllByRole('button')[1].innerHTML).toBe('4')

    fireEvent.click(getAllByRole('button')[0])
    expect(getAllByRole('button')[0].innerHTML).toBe('4')
    expect(getAllByRole('button')[1].innerHTML).toBe('4')

    fireEvent.click(getAllByRole('button')[1])
    expect(getAllByRole('button')[0].innerHTML).toBe('4')
    expect(getAllByRole('button')[1].innerHTML).toBe('5')

    fireEvent.click(getAllByRole('button')[0])
    expect(getAllByRole('button')[0].innerHTML).toBe('5')
    expect(getAllByRole('button')[1].innerHTML).toBe('5')
  })

  test('it should support custom effects for multiple stores', () => {
    type State = {
      A: { a: number }
      B: { b: number }
    }

    let C = createConnectedStoreAs<State>({
      A: { a: 1 },
      B: { b: 1 },
    })

    let X = C.withStores(({ A, B }) => (
      <>
        <button onClick={() => A.set('a')(A.get('a') + 1)}>{A.get('a')}</button>
        <button onClick={() => B.set('b')(B.get('b') + 1)}>{B.get('b')}</button>
      </>
    ))

    let effects: EffectsAs<State> = ({ A, B }) => {
      A.on('a').subscribe((a) => expect(a).toBe(2))
      B.on('b').subscribe((b) => expect(b).toBe(2))
      return { A, B }
    }

    let { getAllByRole } = render(
      <C.Container effects={effects}>
        <X />
      </C.Container>,
    )

    fireEvent.click(getAllByRole('button')[0])
    fireEvent.click(getAllByRole('button')[1])
  })

  test('it should eagerly throw at runtime when using a consumer without a container', () => {
    let { withStores } = createConnectedStoreAs({ A: { a: 1 } })
    let A = withStores(() => <div />)
    expect(() => render(<A />)).toThrow(/does not seem to be nested/)
  })
})
