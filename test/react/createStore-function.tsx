import * as React from 'react'
import { connect, connectAs, createStore, Store } from '../../src'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('createStore (function component)', () => {
  type State = {
    isTrue: boolean
    users: string[]
  }

  let store = createStore<State>({
    isTrue: true,
    users: [],
  })

  type StoreProps = {
    store: Store<State>
  }

  let MyDumbComponent: React.FunctionComponent<StoreProps> = ({ store }) => (
    <div data-testid="MyComponent">
      {store.get('isTrue') ? 'True' : 'False'}
      <button onClick={() => store.set('isTrue')(!store.get('isTrue'))}>
        Update
      </button>
    </div>
  )
  MyDumbComponent.displayName = 'MyComponent'

  let MyComponent = connect(store)(MyDumbComponent)

  test('it should render a component', () => {
    render(<MyComponent />)
    expect(screen.getByTestId('MyComponent').innerHTML).toMatch(/True/)
  })

  test('it should update the component', () => {
    render(<MyComponent />)
    expect(screen.getByTestId('MyComponent').innerHTML).toMatch(/True/)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('MyComponent').innerHTML).toMatch(/False/)
  })

  // nb: test order matters because store is shared!
  test('it should support lenses', () => {
    render(<MyComponent />)
    expect(screen.getByTestId('MyComponent').innerHTML).toMatch(/False/)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('MyComponent').innerHTML).toMatch(/True/)
  })

  test('it should support effects', () => {
    render(<MyComponent />)
    store.on('isTrue').subscribe((_) => expect(_).toBe(false))
    fireEvent.click(screen.getByRole('button'))
  })

  test('it should call .on().subscribe() with the current value', () => {
    render(<MyComponent />)
    store.on('isTrue').subscribe((_) => expect(_).toBe(true))
    fireEvent.click(screen.getByRole('button'))
  })

  test('it should call .onAll().subscribe() with the key, current value, and previous value', () => {
    render(<MyComponent />)
    store.onAll().subscribe((_) => {
      expect(_.key).toBe('isTrue')
      expect(_.previousValue).toBe(true)
      expect(_.value).toBe(false)
    })
    fireEvent.click(screen.getByRole('button'))
  })

  test('it should only re-render if something actually changed', () => {
    let renderCount = 0
    let A = connect(store)(({ store }) => {
      renderCount++
      return (
        <div>
          {store.get('isTrue') ? 'True' : 'False'}
          <button onClick={() => store.set('isTrue')(store.get('isTrue'))}>
            Update
          </button>
        </div>
      )
    })

    render(<A />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(renderCount).toBe(1)
  })

  // There is room for perf optimization down the line.
  // TODO: Add some benchmarks to see how bad this really is. Intuitively, it could
  // cause app perf to degrade at least linearly as the app scales.
  test('it should re-render even if an unused model property changed', () => {
    let renderCount = 0
    let store = createStore({
      a: 1,
      b: 'x',
    })
    let A = connect(store)(({ store }) => {
      renderCount++
      return <div>{store.get('a')}</div>
    })

    render(<A />)
    act(() => store.set('b')('y'))
    act(() => store.set('b')('z'))
    expect(renderCount).toBe(3)
  })

  test('it should set a displayName', () => {
    expect(MyComponent.displayName).toBe('withStore(MyComponent)')
  })

  test('it should set a default displayName', () => {
    expect(connect(store)(() => <div />).displayName).toBe(
      'withStore(Component)',
    )
  })

  test('it should typecheck with additional props', () => {
    type Props = {
      foo: number
      bar: string
    }

    // Props should not include "store"
    let Foo = connect(store)<Props>(({ foo, store }) => (
      <div>
        {store.get('isTrue') ? 'True' : 'False'}
        <button onClick={() => store.set('isTrue')(false)}>Update</button>
      </div>
    ))

    // We don't need to manually pass "store"
    let foo = <Foo foo={1} bar="baz" />

    expect(true).toBeTruthy()
  })

  test('#getState should return up to date state', () => {
    let A = connect(store)(({ store }) => (
      <div>
        {store.get('isTrue') ? 'True' : 'False'}
        <button onClick={() => store.set('isTrue')(!store.get('isTrue'))}>
          Update
        </button>
      </div>
    ))

    render(<A />)
    expect(store.getState()).toEqual({ isTrue: false, users: [] })
    fireEvent.click(screen.getByRole('button'))
    expect(store.getState()).toEqual({ isTrue: true, users: [] })
    fireEvent.click(screen.getByRole('button'))
    expect(store.getState()).toEqual({ isTrue: false, users: [] })
    fireEvent.click(screen.getByRole('button'))
    expect(store.getState()).toEqual({ isTrue: true, users: [] })
  })

  test('#getState should not be writeable', () => {
    let A = connect(store)(({ store }) => <div />)
    render(<A />)
    expect(() => ((store.getState() as any).isTrue = false)).toThrow()
  })

  test('it should update correctly when using nested stores', () => {
    let storeA = createStore({ a: 1 })
    let storeB = createStore({ b: 2 })
    let withStoreA = connect(storeA)
    let withStoreB = connect(storeB)

    type StateA = {
      a: number
    }
    type StateB = {
      b: number
    }

    type PropsA = {
      store: Store<StateA>
    }
    type PropsB = {
      storeA: Store<StateA>
      store: Store<StateB>
    }

    let A = withStoreA(({ store }: PropsA) => <B storeA={store} />)
    let B = withStoreB(({ storeA, store: storeB }: PropsB) => (
      <div>
        {storeA.get('a')}-{storeB.get('b')}
      </div>
    ))

    render(
      <div data-testid="App">
        <A />
      </div>,
    )
    expect(screen.getByTestId('App').innerHTML).toBe('<div>1-2</div>')
    act(() => storeA.set('a')(3))
    expect(screen.getByTestId('App').innerHTML).toBe('<div>3-2</div>')
    act(() => storeB.set('b')(4))
    expect(screen.getByTestId('App').innerHTML).toBe('<div>3-4</div>')
  })

  test('it should memoize setters', () => {
    render(<MyComponent />)
    expect(store.set('isTrue')).toBe(store.set('isTrue'))
    expect(store.set('users')).toBe(store.set('users'))
  })

  test('it should render with multiple stores', () => {
    let storeA = createStore({ a: 1 })
    let storeB = createStore({ b: 'c' })

    let Component = connectAs({
      a: storeA,
      b: storeB,
    })(({ a, b }) => (
      <div data-testid="Component">
        a={a.get('a') * 4}, b={b.get('b').concat('d')}
      </div>
    ))

    render(<Component />)
    expect(screen.getByTestId('Component').innerHTML).toBe('a=4, b=cd')
  })

  test('it should update with multiple stores', () => {
    let storeA = createStore({ a: 1 })
    let storeB = createStore({ b: 'c' })

    let Component = connectAs({
      a: storeA,
      b: storeB,
    })(({ a, b }) => (
      <div data-testid="Component">
        a={a.get('a') * 4}, b={b.get('b').concat('d')}
        <button
          data-testid="updateA"
          onClick={() => a.set('a')(a.get('a') + 10)}
        />
        <button
          data-testid="updateB"
          onClick={() => b.set('b')(b.get('b').toUpperCase())}
        />
      </div>
    ))

    let buttons =
      '<button data-testid="updateA"></button><button data-testid="updateB"></button>'

    render(<Component />)
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=4, b=cd' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateA'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=44, b=cd' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateA'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=84, b=cd' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateB'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=84, b=Cd' + buttons,
    )

    act(() => storeB.set('b')('x'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=84, b=xd' + buttons,
    )

    act(() => storeA.set('a')(50))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=200, b=xd' + buttons,
    )
  })

  test('it should update when any of the stores updated', () => {
    let storeA = createStore({ a: 1 })
    let storeB = createStore({ b: 'c' })

    let renderCount = 0

    let Component = connectAs({
      a: storeA,
      b: storeB,
    })(({ a, b }) => {
      renderCount++
      return (
        <>
          a={a.get('a') * 4}, b={b.get('b').concat('d')}
          <button
            data-testid="updateA"
            onClick={() => a.set('a')(a.get('a') + 10)}
          />
          <button
            data-testid="updateB"
            onClick={() => b.set('b')(b.get('b').toUpperCase())}
          />
        </>
      )
    })

    render(<Component />)
    expect(renderCount).toBe(1)
    fireEvent.click(screen.getByTestId('updateA'))
    fireEvent.click(screen.getByTestId('updateA'))
    fireEvent.click(screen.getByTestId('updateB'))
    act(() => storeB.set('b')('x'))
    act(() => storeA.set('a')(50))
    expect(renderCount).toBe(6)
  })

  //
  // Compilation tests
  // All of the following should compile:
  //

  type CombinedA = { a: number }
  type CombinedB = { b: string }

  let initA: CombinedA = { a: 1 }
  let initB: CombinedB = { b: 'c' }

  let storeA = createStore(initA)
  let storeB = createStore(initB)

  type CombinedComponentProps = {
    a: Store<CombinedA>
    b: Store<CombinedB>
  }

  type ConnectedCombinedAugmentedProps = CombinedComponentProps & {
    x: number
  }

  /// Functional component

  let CombinedComponent = ({ a, b }: CombinedComponentProps) => (
    <div>
      {a.get('a') * 4}
      {b.get('b').concat('d')}
    </div>
  )

  let ConnectedCombinedComponent = connectAs({
    a: storeA,
    b: storeB,
  })(CombinedComponent)

  let ca = <ConnectedCombinedComponent />

  /// Functional component (additional props)

  let CombinedComponent1 = ({ a, b, x }: ConnectedCombinedAugmentedProps) => (
    <div>
      {a.get('a') * 4}
      {b.get('b').concat('d')}
      {x * 3}
    </div>
  )

  let ConnectedCombinedComponent1 = connectAs({
    a: storeA,
    b: storeB,
  })(CombinedComponent1)

  let ca1 = <ConnectedCombinedComponent1 x={3} />

  /// Functional component (inline)

  let ConnectedCombinedComponent2 = connectAs({
    a: storeA,
    b: storeB,
  })(({ a, b }: CombinedComponentProps) => (
    <div>
      {a.get('a') * 4}
      {b.get('b').concat('d')}
    </div>
  ))

  let ca2 = <ConnectedCombinedComponent2 />

  /// Functional component (inline, additional props)

  let ConnectedCombinedComponent3 = connectAs({
    a: storeA,
    b: storeB,
  })(({ a, b, x }: ConnectedCombinedAugmentedProps) => (
    <div>
      {a.get('a') * 4}
      {b.get('b').concat('d')}
      {x * 3}
    </div>
  ))

  let ca3 = <ConnectedCombinedComponent3 x={3} />
})
