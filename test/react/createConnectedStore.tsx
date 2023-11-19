import 'global-jsdom/register'
import test from 'ava'
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
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

function setTimeoutPromise(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test.afterEach(cleanup)

test.serial('it should render', t => {
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

  t.is(screen.getByRole('button').innerHTML, '1')
  fireEvent.click(screen.getByRole('button'))
  t.is(screen.getByRole('button').innerHTML, '2')
})

test.serial('it should update (with extra props)', t => {
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
  t.is(screen.getByRole('button').innerHTML, 'a')
  fireEvent.click(screen.getByRole('button'))
  t.is(screen.getByRole('button').innerHTML, 'b')
})

test.serial('it should support effects', t => {
  t.plan(1)

  type State = {
    a: number
  }

  let withEffects: Effects<State> = (store) => {
    store.on('a').subscribe((a) => {
      t.is(a, 2)
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

test.serial('it should support effects with rx opererators', async t => {
  t.plan(2)
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
  t.is(store!.get('b'), 1)
  fireEvent.click(screen.getByRole('button'))
  fireEvent.click(screen.getByRole('button'))
  await setTimeoutPromise(0)
  t.is(store!.get('b'), 18)
})

test.serial('it should support multiple instances of a store', t => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))

  const {unmount: unmount0} = render(
    <Container>
      <C />
    </Container>,
  )
  const {unmount: unmount1} = render(
    <Container>
      <C />
    </Container>,
  )

  t.is(screen.getAllByRole('button')[0].innerHTML, '1')
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')
  fireEvent.click(screen.getAllByRole('button')[0])
  t.is(screen.getAllByRole('button')[0].innerHTML, '2')
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')
  fireEvent.click(screen.getAllByRole('button')[1])
  t.is(screen.getAllByRole('button')[0].innerHTML, '2')
  t.is(screen.getAllByRole('button')[1].innerHTML, '2')
})

test.serial('it should support multiple instances of a store, with disjoint lifecycles', t => {
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
  t.is(screen.getAllByRole('button')[0].innerHTML, '1')
  fireEvent.click(screen.getAllByRole('button')[0])
  t.is(screen.getAllByRole('button')[0].innerHTML, '2')

  render(
    <Container>
      <C />
    </Container>,
  )
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')
  fireEvent.click(screen.getAllByRole('button')[1])
  t.is(screen.getAllByRole('button')[1].innerHTML, '2')
})

test.serial('it should support multiple instances of a store in one tree, with disjoint lifecycles', t => {
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

  t.is(screen.getByTestId('C').innerHTML, '1')
  fireEvent.click(screen.getByTestId('C'))
  t.is(screen.getByTestId('C').innerHTML, '2')

  // Swap subtree
  fireEvent.click(screen.getByTestId('D'))
  t.is(screen.getByTestId('C').innerHTML, '1')
  fireEvent.click(screen.getByTestId('C'))
  t.is(screen.getByTestId('C').innerHTML, '2')

  // Swap subtree
  fireEvent.click(screen.getByTestId('D'))
  t.is(screen.getByTestId('C').innerHTML, '1')
  fireEvent.click(screen.getByTestId('C'))
  t.is(screen.getByTestId('C').innerHTML, '2')
})

test.serial('it should support interleaved stores', t => {
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

  t.is(screen.getAllByRole('button')[0].innerHTML, '1')
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')
  t.is(screen.getAllByRole('button')[2].innerHTML, '1')

  fireEvent.click(screen.getAllByRole('button')[0])
  t.is(screen.getAllByRole('button')[0].innerHTML, '2')
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')
  t.is(screen.getAllByRole('button')[2].innerHTML, '2')

  fireEvent.click(screen.getAllByRole('button')[1])
  t.is(screen.getAllByRole('button')[0].innerHTML, '2')
  t.is(screen.getAllByRole('button')[1].innerHTML, '2')
  t.is(screen.getAllByRole('button')[2].innerHTML, '2')

  fireEvent.click(screen.getAllByRole('button')[2])
  t.is(screen.getAllByRole('button')[0].innerHTML, '3')
  t.is(screen.getAllByRole('button')[1].innerHTML, '2')
  t.is(screen.getAllByRole('button')[2].innerHTML, '3')
})

test.serial('it should support custom initialState', t => {
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

  t.is(screen.getAllByRole('button')[0].innerHTML, '101')
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')

  fireEvent.click(screen.getAllByRole('button')[0])
  t.is(screen.getAllByRole('button')[0].innerHTML, '102')
  t.is(screen.getAllByRole('button')[1].innerHTML, '1')

  fireEvent.click(screen.getAllByRole('button')[1])
  t.is(screen.getAllByRole('button')[0].innerHTML, '102')
  t.is(screen.getAllByRole('button')[1].innerHTML, '2')
})

test.serial('it should support custom effects', t => {
  t.plan(1)

  type State = {
    a: number
  }

  let { Container, withStore } = createConnectedStore({ a: 1 })

  let withEffects: Effects<State> = (store) => {
    store.on('a').subscribe((a) => {
      t.is(a, 2)
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

test.serial('it should eagerly throw at runtime when using a consumer without a container (createConnectedStore)', t => {
  let { withStore } = createConnectedStore({ a: 1 })
  let A = withStore(() => <div />)
  t.throws(() => render(<A />), {
    message: /does not seem to be nested/,
  })
})

test.serial('it should re-render if a used model property changed', t => {
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

  act(() => act(() => store!.set('a')(2)))
  act(() => act(() => store!.set('a')(3)))
  t.is(renderCount, 3)
})

test.serial('it should re-render if an unused model property changed', t => {
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
  t.is(renderCount, 3)
})

test.serial('it should update even when unused fields change (get)', t => {
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
  t.is(
    screen.getByTestId('A').innerHTML,
    '0<button id="a"></button><button id="b"></button><span></span>',
  )

  fireEvent.click(screen.getByTestId('a')) // Render
  t.is(
    screen.getByTestId('A').innerHTML,
    '1<button id="a"></button><button id="b"></button><div>bar</div>',
  )

  fireEvent.click(screen.getByTestId('b')) // Render
  t.is(
    screen.getByTestId('A').innerHTML,
    '0<button id="a"></button><button id="b"></button><span></span>',
  )

  act(() => store!.set('b')('baz')) // Render
  t.is(
    screen.getByTestId('A').innerHTML,
    '0<button id="a"></button><button id="b"></button><span></span>',
  )
  t.is(renderCount, 5)
})

test.serial('it should update even when unused fields change (get in lifecycle)', t => {
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
  t.is(screen.getByTestId('A').innerHTML, '0<span></span>')
  act(() => store!.set('a')(1)) // Render, and trigger shouldComponentUpdate
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  t.is(renderCount, 5)
})

test.serial('it should update even when unused fields change (getState in lifecycle 1)', t => {
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
  t.is(screen.getByTestId('A').innerHTML, '0')
  act(() => store!.set('a')(1)) // Render, and trigger shouldComponentUpdate
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  t.is(renderCount, 5)
})

test.serial('[stateful] it should update even when unused fields change (getState in lifecycle 2)', t => {
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
  t.is(screen.getByTestId('A').innerHTML, '0')
  act(() => store!.set('a')(1)) // Render, and trigger shouldComponentUpdate
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  t.is(renderCount, 5)
})

test.serial('[stateful] it should update only when subscribed fields change (get in constructor)', t => {
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
  t.is(screen.getByTestId('A').innerHTML, '0<span></span>')
  act(() => store!.set('a')(1)) // Render
  act(() => store!.set('b')('a')) // Render
  act(() => store!.set('b')('b')) // Render
  t.is(renderCount, 5)
})

test.serial('it should update when subscribed fields change (set in constructor)', t => {
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
  t.is(screen.getByTestId('A').innerHTML, '1')
  t.is(renderCount, 2)
})

test.serial('[stateful] it should update when any field changes (getState)', t => {
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

  t.is(
    screen.getByTestId('A').innerHTML,
    '0<button id="a"></button><button id="b"></button><span></span>',
  )

  fireEvent.click(screen.getByTestId('a')) // Render
  t.is(
    screen.getByTestId('A').innerHTML,
    '1<button id="a"></button><button id="b"></button><div>bar</div>',
  )

  fireEvent.click(screen.getByTestId('b')) // Render
  t.is(
    screen.getByTestId('A').innerHTML,
    '0<button id="a"></button><button id="b"></button><span></span>',
  )

  act(() => store!.set('b')('baz')) // Render
  t.is(
    screen.getByTestId('A').innerHTML,
    '0<button id="a"></button><button id="b"></button><span></span>',
  )
  t.is(renderCount, 5)
})

test.serial("it should get the most up-to-date version of a field, even if Undux doesn't know the component depends on it", t => {
  t.plan(2)
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
        <B onClick={(a) => t.is(a, 1)} />
      </div>
    </S.Container>,
  )
  t.is(screen.getByTestId('B').innerHTML, '<button></button>1')
  fireEvent.click(screen.getByRole('button'))
})

test.serial('it should return the same value when call .get multiple times for one snapshot', t => {
  t.plan(4)
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
                return t.is(a, 1)
              case 1:
                return t.is(a, 1)
              case 2:
                return t.is(a, 1)
            }
            call++
          }}
        />
      </div>
    </S.Container>,
  )
  t.is(screen.getByTestId('B').innerHTML, '<button></button>1')
  fireEvent.click(screen.getByRole('button'))
})

test.serial('it should return the same value when call .get multiple times for one snapshot, even when using shouldComponentUpdate', t => {
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
  t.is(store!.get('a'), 'a')
  t.is(screen.getByTestId('A').innerHTML, '<button>a</button>')

  fireEvent.click(screen.getByRole('button'))
  t.is(store!.get('a'), 'x')
  t.is(screen.getByTestId('A').innerHTML, '<button>x</button>')

  fireEvent.click(screen.getByRole('button'))
  t.is(store!.get('a'), 'y')
  t.is(screen.getByTestId('A').innerHTML, '<button>y</button>')

  fireEvent.click(screen.getByRole('button'))
  t.is(store!.get('a'), 'z')
  t.is(screen.getByTestId('A').innerHTML, '<button>z</button>')
})

test.serial('it should fail for async updates by default', t => {
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
  t.deepEqual(store!.get('as'), [2])
})

test.serial('it should work for async updates using setFrom_EXPERIMENTAL', t => {
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
  t.deepEqual(store!.get('as'), [0, 1, 2])
})

test.serial('setFrom_EXPERIMENTAL should compose', t => {
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
  t.deepEqual(store!.get('as'), [0, 1, 2, 3, 4, 5])
})

test.serial('setFrom_EXPERIMENTAL should chain', t => {
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
  t.deepEqual(store!.get('as'), 3)
})
