import * as React from 'react'
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  pairwise,
} from 'rxjs/operators'
import { Effects, Store } from '../../src'
import { createConnectedStore } from '../../src/react/createConnectedStore'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from '@jest/globals'

function setTimeoutPromise(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('it should render', () => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let B = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  render(
    <Container>
      <B />
    </Container>,
  )

  expect(screen.getByRole('button').innerHTML).toBe('1')
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('button').innerHTML).toBe('2')
})

test('it should update (with extra props)', () => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  type Props = {
    extra: string
    onChange(): void
    store: Store<{ a: number }>
  }
  let B = withStore((props: Props) => (
    <>
      <button onClick={() => props.onChange()}>{props.extra}</button>
      {props.store.get('a')}
    </>
  ))
  class A extends React.Component {
    state = {
      extra: 'a',
    }
    onChange = () => this.setState({ extra: 'b' })
    render() {
      return (
        <Container>
          <B extra={this.state.extra} onChange={this.onChange} />
        </Container>
      )
    }
  }

  render(<A />)
  expect(screen.getByRole('button').innerHTML).toBe('a')
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('button').innerHTML).toBe('b')
})

test('it should support effects', () => {
  type State = {
    a: number
  }

  let withEffects: Effects<State> = (store) => {
    store.on('a').subscribe((a) => {
      expect(a).toBe(2)
    })
    return store
  }

  let { Container, withStore } = createConnectedStore({ a: 1 }, withEffects)

  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  render(
    <Container>
      <C />
    </Container>,
  )

  fireEvent.click(screen.getByRole('button'))
})

test('it should support effects with rx opererators', async () => {
  type State = {
    a: number
    b: number
  }
  let store: Store<{ a: number; b: number }>
  let withEffects: Effects<State> = (s) => {
    store = s
    s.on('a')
      .pipe(
        distinctUntilChanged(),
        filter((_) => _ > 2),
        pairwise(),
        map(([a]) => a * 6),
        debounceTime(0),
      )
      .subscribe(store.set('b'))
    return s
  }
  let { Container, withStore } = createConnectedStore(
    { a: 1, b: 1 },
    withEffects,
  )
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))

  render(
    <Container>
      <C />
    </Container>,
  )

  fireEvent.click(screen.getByRole('button'))
  expect(store!.get('b')).toBe(1)
  fireEvent.click(screen.getByRole('button'))
  fireEvent.click(screen.getByRole('button'))
  await setTimeoutPromise(0)
  expect(store!.get('b')).toBe(18)
})

test('it should support multiple instances of a store', () => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))

  const { unmount: unmount0 } = render(
    <Container>
      <C />
    </Container>,
  )
  const { unmount: unmount1 } = render(
    <Container>
      <C />
    </Container>,
  )

  expect(screen.getAllByRole('button')[0].innerHTML).toBe('1')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')
  fireEvent.click(screen.getAllByRole('button')[0])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('2')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')
  fireEvent.click(screen.getAllByRole('button')[1])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('2')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('2')
})

test('it should support multiple instances of a store, with disjoint lifecycles', () => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))

  render(
    <Container>
      <C />
    </Container>,
  )
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('1')
  fireEvent.click(screen.getAllByRole('button')[0])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('2')

  render(
    <Container>
      <C />
    </Container>,
  )
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')
  fireEvent.click(screen.getAllByRole('button')[1])
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('2')
})

test('it should support multiple instances of a store in one tree, with disjoint lifecycles', () => {
  let Test = createConnectedStore({ isA: true })
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button data-testid="C" onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  let A = () => (
    <Container>
      <C />
    </Container>
  )
  let B = () => (
    <Container>
      <C />
    </Container>
  )

  let D = Test.withStore(({ store }) => (
    <>
      {store.get('isA') ? <A /> : <B />}
      <button
        data-testid="D"
        onClick={() => store.set('isA')(!store.get('isA'))}
      />
    </>
  ))

  render(
    <Test.Container>
      <D />
    </Test.Container>,
  )

  expect(screen.getByTestId('C').innerHTML).toBe('1')
  fireEvent.click(screen.getByTestId('C'))
  expect(screen.getByTestId('C').innerHTML).toBe('2')

  // Swap subtree
  fireEvent.click(screen.getByTestId('D'))
  expect(screen.getByTestId('C').innerHTML).toBe('1')
  fireEvent.click(screen.getByTestId('C'))
  expect(screen.getByTestId('C').innerHTML).toBe('2')

  // Swap subtree
  fireEvent.click(screen.getByTestId('D'))
  expect(screen.getByTestId('C').innerHTML).toBe('1')
  fireEvent.click(screen.getByTestId('C'))
  expect(screen.getByTestId('C').innerHTML).toBe('2')
})

test('it should support interleaved stores', () => {
  let A = createConnectedStore({ a: 1 })
  let B = createConnectedStore({ b: 1 })
  let C = A.withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  let D = B.withStore(({ store }) => (
    <button onClick={() => store.set('b')(store.get('b') + 1)}>
      {store.get('b')}
    </button>
  ))

  render(
    <A.Container>
      <C />
      <B.Container>
        <D />
        <C />
      </B.Container>
    </A.Container>,
  )

  expect(screen.getAllByRole('button')[0].innerHTML).toBe('1')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')
  expect(screen.getAllByRole('button')[2].innerHTML).toBe('1')

  fireEvent.click(screen.getAllByRole('button')[0])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('2')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')
  expect(screen.getAllByRole('button')[2].innerHTML).toBe('2')

  fireEvent.click(screen.getAllByRole('button')[1])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('2')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('2')
  expect(screen.getAllByRole('button')[2].innerHTML).toBe('2')

  fireEvent.click(screen.getAllByRole('button')[2])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('3')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('2')
  expect(screen.getAllByRole('button')[2].innerHTML).toBe('3')
})

test('it should support custom initialState', () => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))

  render(
    <Container initialState={{ a: 101 }}>
      <C />
    </Container>,
  )
  render(
    <Container>
      <C />
    </Container>,
  )

  expect(screen.getAllByRole('button')[0].innerHTML).toBe('101')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')

  fireEvent.click(screen.getAllByRole('button')[0])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('102')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('1')

  fireEvent.click(screen.getAllByRole('button')[1])
  expect(screen.getAllByRole('button')[0].innerHTML).toBe('102')
  expect(screen.getAllByRole('button')[1].innerHTML).toBe('2')
})

test('it should support custom effects', () => {
  type State = {
    a: number
  }

  let { Container, withStore } = createConnectedStore({ a: 1 })

  let withEffects: Effects<State> = (store) => {
    store.on('a').subscribe((a) => {
      expect(a).toBe(2)
    })
    return store
  }

  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))

  render(
    <Container effects={withEffects}>
      <C />
    </Container>,
  )
  fireEvent.click(screen.getByRole('button'))
})

test('it should eagerly throw at runtime when using a consumer without a container (createConnectedStore)', () => {
  let { withStore } = createConnectedStore({ a: 1 })
  let A = withStore(() => <div />)
  expect(() => render(<A />)).toThrow(/does not seem to be nested/)
})

test('it should re-render if a used model property changed', () => {
  let renderCount = 0
  let store: Store<{ a: number; b: number }>
  let S = createConnectedStore(
    {
      a: 1,
      b: 1,
    },
    (s) => {
      store = s
      return s
    },
  )
  let A = S.withStore(({ store }) => {
    renderCount++
    return <>{store.get('a')}</>
  })

  render(
    <S.Container>
      <A />
    </S.Container>,
  )

  act(() => store!.set('a')(2))
  act(() => store!.set('a')(3))
  expect(renderCount).toBe(3)
})

test('it should re-render if an unused model property changed', () => {
  let renderCount = 0
  let store: Store<{ a: number; b: number }>
  let S = createConnectedStore(
    {
      a: 1,
      b: 1,
    },
    (s) => {
      store = s
      return s
    },
  )
  let A = S.withStore(({ store }) => {
    renderCount++
    return <>{store.get('a')}</>
  })

  render(
    <S.Container>
      <A />
    </S.Container>,
  )
  act(() => store!.set('b')(2))
  act(() => store!.set('b')(3))
  expect(renderCount).toBe(3)
})

test('it should update even when unused fields change (get)', () => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo',
    },
    (s) => {
      store = s
      return s
    },
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      render() {
        renderCount++
        return (
          <>
            {this.props.store.get('a')}
            <button
              data-testid="a"
              onClick={() =>
                this.props.store.set('a')(this.props.store.get('a') + 1)
              }
            />
            <button
              data-testid="b"
              onClick={() =>
                this.props.store.set('a')(this.props.store.get('a') - 1)
              }
            />
            {this.props.store.get('a') > 0 ? (
              <div>{this.props.store.get('b')}</div>
            ) : (
              <span />
            )}
          </>
        )
      }
    },
  )
  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )

  act(() => store!.set('b')('bar')) // No render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '0<button data-testid="a"></button><button data-testid="b"></button><span></span>',
  )

  fireEvent.click(screen.getByTestId('a')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '1<button data-testid="a"></button><button data-testid="b"></button><div>bar</div>',
  )

  fireEvent.click(screen.getByTestId('b')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '0<button data-testid="a"></button><button data-testid="b"></button><span></span>',
  )

  act(() => store!.set('b')('baz')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '0<button data-testid="a"></button><button data-testid="b"></button><span></span>',
  )
  expect(renderCount).toBe(5)
})

test('it should update even when unused fields change (get in lifecycle)', () => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo',
    },
    (s) => {
      store = s
      return s
    },
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      shouldComponentUpdate(p: Props) {
        return p.store.get('b') !== this.props.store.get('b') || true
      }
      render() {
        renderCount++
        return (
          <>
            {this.props.store.get('a')}
            {this.props.store.get('a') > 0 ? (
              <div>{this.props.store.get('b')}</div>
            ) : (
              <span />
            )}
          </>
        )
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )
  act(() => store!.set('b')('bar')) // No render
  expect(screen.getByTestId('A').innerHTML).toBe('0<span></span>')
  act(() => store!.set('a')(1)) // Render, and trigger shouldComponentUpdate
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  expect(renderCount).toBe(5)
})

test('it should update even when unused fields change (getState in lifecycle 1)', () => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo',
    },
    (s) => {
      store = s
      return s
    },
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      shouldComponentUpdate(p: Props) {
        return p.store.getState().b !== this.props.store.get('b') || true
      }
      render() {
        renderCount++
        return this.props.store.get('a')
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )
  act(() => store!.set('b')('bar')) // No render
  expect(screen.getByTestId('A').innerHTML).toBe('0')
  act(() => store!.set('a')(1)) // Render, and trigger shouldComponentUpdate
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  expect(renderCount).toBe(5)
})

test('[stateful] it should update even when unused fields change (getState in lifecycle 2)', () => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo',
    },
    (s) => {
      store = s
      return s
    },
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      shouldComponentUpdate(p: Props) {
        return p.store.get('b') !== this.props.store.getState().b || true
      }
      render() {
        renderCount++
        return this.props.store.get('a')
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )
  act(() => store!.set('b')('bar')) // No render
  expect(screen.getByTestId('A').innerHTML).toBe('0')
  act(() => store!.set('a')(1)) // Render, and trigger shouldComponentUpdate
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  expect(renderCount).toBe(5)
})

test('[stateful] it should update only when subscribed fields change (get in constructor)', () => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo',
    },
    (s) => {
      store = s
      return s
    },
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        let _ = this.props.store.get('b') // Trigger read
      }
      render() {
        renderCount++
        return (
          <>
            {this.props.store.get('a')}
            {this.props.store.get('a') > 0 ? (
              <div>{this.props.store.get('b')}</div>
            ) : (
              <span />
            )}
          </>
        )
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )

  act(() => store!.set('b')('bar')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe('0<span></span>')
  act(() => store!.set('a')(1)) // Render
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  expect(renderCount).toBe(5)
})

test('it should update when subscribed fields change (set in constructor)', () => {
  let S = createConnectedStore({
    a: 0,
  })
  let renderCount = 0
  type Props = {
    store: Store<{ a: number }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        this.props.store.set('a')(1)
      }
      render() {
        renderCount++
        return <>{this.props.store.get('a')}</>
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )
  expect(screen.getByTestId('A').innerHTML).toBe('1')
  expect(renderCount).toBe(2)
})

test('[stateful] it should update when any field changes (getState)', () => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo',
    },
    (s) => {
      store = s
      return s
    },
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      render() {
        renderCount++
        return (
          <>
            {this.props.store.getState().a}
            <button
              data-testid="a"
              onClick={() =>
                this.props.store.set('a')(this.props.store.get('a') + 1)
              }
            />
            <button
              data-testid="b"
              onClick={() =>
                this.props.store.set('a')(this.props.store.get('a') - 1)
              }
            />
            {this.props.store.get('a') > 0 ? (
              <div>{this.props.store.get('b')}</div>
            ) : (
              <span />
            )}
          </>
        )
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )
  act(() => store!.set('b')('bar')) // Render (this is the deoptimization when you use .getState)

  expect(screen.getByTestId('A').innerHTML).toBe(
    '0<button data-testid="a"></button><button data-testid="b"></button><span></span>',
  )

  fireEvent.click(screen.getByTestId('a')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '1<button data-testid="a"></button><button data-testid="b"></button><div>bar</div>',
  )

  fireEvent.click(screen.getByTestId('b')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '0<button data-testid="a"></button><button data-testid="b"></button><span></span>',
  )

  act(() => store!.set('b')('baz')) // Render
  expect(screen.getByTestId('A').innerHTML).toBe(
    '0<button data-testid="a"></button><button data-testid="b"></button><span></span>',
  )
  expect(renderCount).toBe(5)
})

test("it should get the most up-to-date version of a field, even if Undux doesn't know the component depends on it", () => {
  let S = createConnectedStore({
    a: 0,
  })
  type Props = {
    store: Store<{ a: number }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        this.props.store.set('a')(1)
      }
      render() {
        return <>{this.props.store.get('a')}</>
      }
    },
  )
  let B = S.withStore(
    class Test extends React.Component<Props & { onClick(a: number): void }> {
      onClick = () => this.props.onClick(this.props.store.get('a'))
      render() {
        return (
          <>
            <button onClick={this.onClick} />
            <A />
          </>
        )
      }
    },
  )

  render(
    <S.Container>
      <div data-testid="B">
        <B onClick={(a) => expect(a).toBe(1)} />
      </div>
    </S.Container>,
  )
  expect(screen.getByTestId('B').innerHTML).toBe('<button></button>1')
  fireEvent.click(screen.getByRole('button'))
})

test('it should return the same value when call .get multiple times for one snapshot', () => {
  let S = createConnectedStore({
    a: 0,
  })
  type Props = {
    store: Store<{ a: number }>
  }
  let A = S.withStore(
    class Test extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        this.props.store.set('a')(1)
      }
      render() {
        return <>{this.props.store.get('a')}</>
      }
    },
  )
  let B = S.withStore(
    class Test extends React.Component<Props & { onClick(a: number): void }> {
      onClick = () => {
        this.props.onClick(this.props.store.get('a'))
        this.props.onClick(this.props.store.get('a'))
        this.props.onClick(this.props.store.get('a'))
      }
      render() {
        return (
          <>
            <button onClick={this.onClick} />
            <A />
          </>
        )
      }
    },
  )
  let call = 0

  render(
    <S.Container>
      <div data-testid="B">
        <B
          onClick={(a) => {
            switch (call) {
              case 0:
                return expect(a).toBe(1)
              case 1:
                return expect(a).toBe(1)
              case 2:
                return expect(a).toBe(1)
            }
            call++
          }}
        />
      </div>
    </S.Container>,
  )
  expect(screen.getByTestId('B').innerHTML).toBe('<button></button>1')
  fireEvent.click(screen.getByRole('button'))
})

test('it should return the same value when call .get multiple times for one snapshot, even when using shouldComponentUpdate', () => {
  let S = createConnectedStore({
    a: 'a',
  })
  let X = S.withStore((props) => (
    <button onClick={() => props.store.set('a')('x')}>
      {props.store.get('a')}
    </button>
  ))
  let Y = S.withStore((props) => (
    <button onClick={() => props.store.set('a')('y')}>
      {props.store.get('a')}
    </button>
  ))
  let Z = S.withStore((props) => (
    <button onClick={() => props.store.set('a')('z')}>
      {props.store.get('a')}
    </button>
  ))
  let A = S.withStore(
    class Test extends React.Component<{ store: Store<{ a: string }> }> {
      shouldComponentUpdate(props: { store: Store<{ a: string }> }) {
        return props.store.get('a') !== this.props.store.get('a')
      }
      render() {
        switch (this.props.store.get('a')) {
          case 'a':
            return <X />
          case 'x':
            return <Y />
          case 'y':
            return <Z />
          default:
            return <>{this.props.store.get('a')}</>
        }
      }
    },
  )
  let store: Store<{ a: string }>
  let Leak = S.withStore((props) => {
    store = (props as any).store.storeDefinition
    return null
  })

  render(
    <S.Container>
      <Leak />
      <div data-testid="A">
        <A />
      </div>
    </S.Container>,
  )
  expect(store!.get('a')).toBe('a')
  expect(screen.getByTestId('A').innerHTML).toBe('<button>a</button>')

  fireEvent.click(screen.getByRole('button'))
  expect(store!.get('a')).toBe('x')
  expect(screen.getByTestId('A').innerHTML).toBe('<button>x</button>')

  fireEvent.click(screen.getByRole('button'))
  expect(store!.get('a')).toBe('y')
  expect(screen.getByTestId('A').innerHTML).toBe('<button>y</button>')

  fireEvent.click(screen.getByRole('button'))
  expect(store!.get('a')).toBe('z')
  expect(screen.getByTestId('A').innerHTML).toBe('z')
})

test('it should fail for async updates by default', () => {
  type State = {
    as: number[]
  }
  let S = createConnectedStore<State>({ as: [] })
  let index = 0

  type Props = {
    store: Store<State>
  }
  class A extends React.Component<Props> {
    componentDidMount() {
      const as = this.props.store.get('as')
      this.props.store.set('as')([...as, index++])
    }
    render() {
      return <div />
    }
  }
  let A1 = S.withStore(A)

  function B() {
    return (
      <>
        <A1 />
        <A1 />
        <A1 />
      </>
    )
  }

  let store: Store<State>
  let Leak = S.withStore((props) => {
    store = (props as any).store.storeDefinition
    return null
  })

  render(
    <S.Container>
      <Leak />
      <B />
    </S.Container>,
  )
  expect(store!.get('as')).toEqual([2])
})

test('it should work for async updates using setFrom_EXPERIMENTAL', () => {
  type State = {
    as: number[]
  }
  let S = createConnectedStore<State>({ as: [] })
  let index = 0

  type Props = {
    store: Store<State>
  }
  class A extends React.Component<Props> {
    componentDidMount() {
      this.props.store.setFrom_EXPERIMENTAL((store) => {
        let as = store.get('as')
        store.set('as')([...as, index++])
      })
    }
    render() {
      return <div />
    }
  }
  let A1 = S.withStore(A)

  function B() {
    return (
      <>
        <A1 />
        <A1 />
        <A1 />
      </>
    )
  }

  let store: Store<State>
  let Leak = S.withStore((props) => {
    store = (props as any).store.storeDefinition
    return null
  })

  render(
    <S.Container>
      <Leak />
      <B />
    </S.Container>,
  )
  expect(store!.get('as')).toEqual([0, 1, 2])
})

test('setFrom_EXPERIMENTAL should compose', () => {
  type State = {
    as: number[]
  }
  let S = createConnectedStore<State>({ as: [] })
  let index = 0

  type Props = {
    store: Store<State>
  }
  class A extends React.Component<Props> {
    componentDidMount() {
      this.props.store.setFrom_EXPERIMENTAL((store) => {
        let as = store.get('as')
        store.set('as')([...as, index++])

        // One more time
        store.setFrom_EXPERIMENTAL((store) => {
          let as = store.get('as')
          store.set('as')([...as, index++])
        })
      })
    }
    render() {
      return <div />
    }
  }
  let A1 = S.withStore(A)

  function B() {
    return (
      <>
        <A1 />
        <A1 />
        <A1 />
      </>
    )
  }

  let store: Store<State>
  let Leak = S.withStore((props) => {
    store = (props as any).store.storeDefinition
    return null
  })

  render(
    <S.Container>
      <Leak />
      <B />
    </S.Container>,
  )
  expect(store!.get('as')).toEqual([0, 1, 2, 3, 4, 5])
})

test('setFrom_EXPERIMENTAL should chain', () => {
  type State = {
    as: number
  }
  let S = createConnectedStore<State>({ as: 0 })

  type Props = {
    store: Store<State>
  }
  class A extends React.Component<Props> {
    componentDidMount() {
      this.props.store.setFrom_EXPERIMENTAL((store) =>
        store.set('as')(store.get('as') + 1),
      )
      this.props.store.setFrom_EXPERIMENTAL((store) =>
        store.set('as')(store.get('as') + 1),
      )
      this.props.store.setFrom_EXPERIMENTAL((store) =>
        store.set('as')(store.get('as') + 1),
      )
    }
    render() {
      return <div />
    }
  }
  let A1 = S.withStore(A)

  let store: Store<State>
  let Leak = S.withStore((props) => {
    store = (props as any).store.storeDefinition
    return null
  })

  render(
    <S.Container>
      <Leak />
      <A1 />
    </S.Container>,
  )
  expect(store!.get('as')).toEqual(3)
})
