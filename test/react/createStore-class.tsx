import * as React from 'react'
import {
  connect,
  connectAs,
  createStore,
  Store,
  StoreSnapshot,
} from '../../src'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

describe('createStore (class component)', () => {
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

  let MyComponent = connect(store)(
    class MyComponent extends React.Component<StoreProps> {
      render() {
        return (
          <div data-testid="MyComponent">
            {this.props.store.get('isTrue') ? 'True' : 'False'}
            <button
              onClick={() =>
                this.props.store.set('isTrue')(!store.get('isTrue'))
              }
            >
              Update
            </button>
          </div>
        )
      }
    },
  )

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

  test('[statelful] it should call .onAll().subscribe() with the key, current value, and previous value', () => {
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
    let A = connect(store)(
      class extends React.Component<StoreProps> {
        render() {
          renderCount++
          return (
            <div>
              {this.props.store.get('isTrue') ? 'True' : 'False'}
              <button
                onClick={() =>
                  this.props.store.set('isTrue')(this.props.store.get('isTrue'))
                }
              >
                Update
              </button>
            </div>
          )
        }
      },
    )

    render(<A />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(renderCount).toBe(1)
  })

  test('it should set a displayName', () => {
    expect(MyComponent.displayName).toBe('withStore(MyComponent)')
  })

  test('it should typecheck with additional props', () => {
    type Props2 = StoreProps & {
      foo: number
      bar: string
    }

    // Props should not include "store"
    let Foo = connect(store)<Props2>(
      class Foo extends React.Component<Props2> {
        render() {
          return (
            <div>
              {this.props.store.get('isTrue') ? 'True' : 'False'}
              {this.props.foo}
            </div>
          )
        }
      },
    )

    // We don't need to manually pass "store"
    render(<Foo foo={1} bar="baz" />)

    expect(true).toBeTruthy()
  })

  test('it should support lifecycle methods', () => {
    let renderCount = 0
    let updateCount = 0
    let store = createStore<State>({
      isTrue: true,
      users: [],
    })
    let A = connect(store)(
      class extends React.Component<StoreProps> {
        shouldComponentUpdate({ store }: StoreProps) {
          return store.get('users').length > 3
        }
        componentDidUpdate() {
          updateCount++
        }
        render() {
          renderCount++
          return (
            <div data-testid="A">
              {this.props.store.get('users').length > 3 ? 'FRESH' : 'STALE'}
              <button
                onClick={() =>
                  this.props.store.set('users')(
                    this.props.store.get('users').concat('x'),
                  )
                }
              >
                Update
              </button>
            </div>
          )
        }
      },
    )

    render(<A />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('A').innerHTML).toMatch(/STALE/)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('A').innerHTML).toMatch(/STALE/)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('A').innerHTML).toMatch(/STALE/)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('A').innerHTML).toMatch(/FRESH/)
    expect(renderCount).toBe(2)
    expect(updateCount).toBe(1)
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

    let A = withStoreA(
      class extends React.Component<PropsA> {
        render() {
          return <B storeA={this.props.store} />
        }
      },
    )

    let B = withStoreB(
      class extends React.Component<PropsB> {
        render() {
          return (
            <>
              {this.props.storeA.get('a')}-{this.props.store.get('b')}
            </>
          )
        }
      },
    )

    render(
      <div data-testid="MyComponent">
        <A />
      </div>,
    )
    expect(screen.getByTestId('MyComponent').innerHTML).toBe('1-2')
    act(() => storeA.set('a')(3))
    expect(screen.getByTestId('MyComponent').innerHTML).toBe('3-2')
    act(() => storeB.set('b')(4))
    expect(screen.getByTestId('MyComponent').innerHTML).toBe('3-4')
  })

  test('it should memoize setters', () => {
    render(<MyComponent />)
    expect(store.set('isTrue')).toBe(store.set('isTrue'))
    expect(store.set('users')).toBe(store.set('users'))
  })

  test('it should render with multiple stores', () => {
    type A = { a: number }
    type B = { b: string }

    let storeA = createStore<A>({ a: 1 })
    let storeB = createStore<B>({ b: 'c' })

    type Props = {
      a: StoreSnapshot<A>
      b: StoreSnapshot<B>
    }

    class Component extends React.Component<Props> {
      render() {
        return (
          <div data-testid="Component">
            a={this.props.a.get('a') * 4}, b={this.props.b.get('b').concat('d')}
          </div>
        )
      }
    }

    let ConnectedComponent = connectAs({
      a: storeA,
      b: storeB,
    })(Component)

    render(<ConnectedComponent />)
    expect(screen.getByTestId('Component').innerHTML).toBe('a=4, b=cd')
  })

  test('it should update with multiple stores', () => {
    type A = { a: number }
    type B = { b: string }
    type C = { c: { d: boolean } }

    let storeA = createStore<A>({ a: 1 })
    let storeB = createStore<B>({ b: 'c' })
    let storeC = createStore<C>({ c: { d: true } })

    type Props = {
      a: StoreSnapshot<A>
      b: StoreSnapshot<B>
      c: StoreSnapshot<C>
    }

    let Component = connectAs({
      a: storeA,
      b: storeB,
      c: storeC,
    })(
      class extends React.Component<Props> {
        render() {
          return (
            <>
              a={this.props.a.get('a') * 4}, b=
              {this.props.b.get('b').concat('d')}, c=
              {this.props.c.get('c').d.toString()}
              <button
                data-testid="updateA"
                onClick={() =>
                  this.props.a.set('a')(this.props.a.get('a') + 10)
                }
              />
              <button
                data-testid="updateB"
                onClick={() =>
                  this.props.b.set('b')(this.props.b.get('b').toUpperCase())
                }
              />
              <button
                data-testid="updateC"
                onClick={() =>
                  this.props.c.set('c')({ d: !this.props.c.get('c').d })
                }
              />
            </>
          )
        }
      },
    )

    let buttons =
      '<button data-testid="updateA"></button><button data-testid="updateB"></button><button data-testid="updateC"></button>'

    render(
      <div data-testid="Component">
        <Component />
      </div>,
    )
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=4, b=cd, c=true' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateA'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=44, b=cd, c=true' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateA'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=84, b=cd, c=true' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateB'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=84, b=Cd, c=true' + buttons,
    )

    act(() => storeB.set('b')('x'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=84, b=xd, c=true' + buttons,
    )

    act(() => storeA.set('a')(50))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=200, b=xd, c=true' + buttons,
    )

    fireEvent.click(screen.getByTestId('updateC'))
    expect(screen.getByTestId('Component').innerHTML).toBe(
      'a=200, b=xd, c=false' + buttons,
    )
  })

  test('it should update when any of the stores updated', () => {
    type A = { a: number }
    type B = { b: string }

    let storeA = createStore<A>({ a: 1 })
    let storeB = createStore<B>({ b: 'c' })

    type Props = {
      a: StoreSnapshot<A>
      b: StoreSnapshot<B>
    }

    let renderCount = 0

    let Component = connectAs({
      a: storeA,
      b: storeB,
    })(
      class extends React.Component<Props> {
        render() {
          renderCount++
          return (
            <>
              a={this.props.a.get('a') * 4}, b=
              {this.props.b.get('b').concat('d')}
              <button
                data-testid="updateA"
                onClick={() =>
                  this.props.a.set('a')(this.props.a.get('a') + 10)
                }
              />
              <button
                data-testid="updateB"
                onClick={() =>
                  this.props.b.set('b')(this.props.b.get('b').toUpperCase())
                }
              />
            </>
          )
        }
      },
    )

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

  /// Class component

  class CombinedComponent10 extends React.Component<CombinedComponentProps> {
    render() {
      return (
        <div>
          {this.props.a.get('a') * 4}
          {this.props.b.get('b').concat('d')}
        </div>
      )
    }
  }

  let ConnectedCombinedComponent10 = connectAs({
    a: storeA,
    b: storeB,
  })(CombinedComponent10)

  let ca10 = <ConnectedCombinedComponent10 />

  /// Class component (additional props)

  class CombinedComponent11 extends React.Component<ConnectedCombinedAugmentedProps> {
    render() {
      return (
        <div>
          {this.props.a.get('a') * 4}
          {this.props.b.get('b').concat('d')}
          {this.props.x * 3}
        </div>
      )
    }
  }

  let ConnectedCombinedComponent11 = connectAs({
    a: storeA,
    b: storeB,
  })(CombinedComponent11)

  let ca11 = <ConnectedCombinedComponent11 x={3} />

  /// Class component (inline)

  let ConnectedCombinedComponent12 = connectAs({
    a: storeA,
    b: storeB,
  })(
    class extends React.Component<CombinedComponentProps> {
      render() {
        return (
          <div>
            {this.props.a.get('a') * 4}
            {this.props.b.get('b').concat('d')}
          </div>
        )
      }
    },
  )

  let ca12 = <ConnectedCombinedComponent12 />

  /// Class component (inline, additional props)

  let ConnectedCombinedComponent13 = connectAs({
    a: storeA,
    b: storeB,
  })(
    class extends React.Component<ConnectedCombinedAugmentedProps> {
      render() {
        return (
          <div>
            {this.props.a.get('a') * 13}
            {this.props.b.get('b').concat('d')}
            {this.props.x * 3}
          </div>
        )
      }
    },
  )

  let ca13 = <ConnectedCombinedComponent13 x={4} />
})
