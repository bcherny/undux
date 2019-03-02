import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { Effects, Store } from '../../src'
import { createConnectedStore } from '../../src/react/createConnectedStore'
import { withElement } from '../testUtils'

test('it should render', t => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let B = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  let A = () => (
    <Container>
      <B />
    </Container>
  )

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })
})

test('it should update (with extra props)', t => {
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
      extra: 'a'
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

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, 'a')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, 'b')
  })
})

test('it should support effects', t => {
  t.plan(1)

  type State = {
    a: number
  }

  let withEffects: Effects<State> = store => {
    store.on('a').subscribe(a => {
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
  let A = () => (
    <Container>
      <C />
    </Container>
  )

  withElement(A, _ => Simulate.click(_.querySelector('button')!))
})

test('it should support multiple instances of a store', t => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
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

  withElement(A, a =>
    withElement(B, b => {
      t.is(a.querySelector('button')!.innerHTML, '1')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(a.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '2')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(b.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '2')
      t.is(b.querySelector('button')!.innerHTML, '2')
    })
  )
})

test('it should support multiple instances of a store, with disjoint lifecycles', t => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
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

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })

  withElement(B, b => {
    t.is(b.querySelector('button')!.innerHTML, '1')
    Simulate.click(b.querySelector('button')!)
    t.is(b.querySelector('button')!.innerHTML, '2')
  })
})

test('it should support multiple instances of a store in one tree, with disjoint lifecycles', t => {
  let Test = createConnectedStore({ isA: true })
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button id="C" onClick={() => store.set('a')(store.get('a') + 1)}>
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
      <button id="D" onClick={() => store.set('isA')(!store.get('isA'))} />
    </>
  ))
  let E = () => (
    <Test.Container>
      <D />
    </Test.Container>
  )

  withElement(E, e => {
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')

    // Swap subtree
    Simulate.click(e.querySelector('#D')!)
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')

    // Swap subtree
    Simulate.click(e.querySelector('#D')!)
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')
  })
})

test('it should support interleaved stores', t => {
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
  let X = () => (
    <A.Container>
      <C />
      <B.Container>
        <D />
        <C />
      </B.Container>
    </A.Container>
  )

  withElement(X, x => {
    assertButtons(x, 1, 1, 1)
    Simulate.click(x.querySelectorAll('button')[0])
    assertButtons(x, 2, 1, 2)
    Simulate.click(x.querySelectorAll('button')[1])
    assertButtons(x, 2, 2, 2)
    Simulate.click(x.querySelectorAll('button')[2])
    assertButtons(x, 3, 2, 3)
  })

  function assertButtons(x: Element, one: number, two: number, three: number) {
    t.is(x.querySelectorAll('button')[0].innerHTML, one.toString())
    t.is(x.querySelectorAll('button')[1].innerHTML, two.toString())
    t.is(x.querySelectorAll('button')[2].innerHTML, three.toString())
  }
})

test('it should support custom initialState', t => {
  let { Container, withStore } = createConnectedStore({ a: 1 })
  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  let A = () => (
    <Container initialState={{ a: 101 }}>
      <C />
    </Container>
  )
  let B = () => (
    <Container>
      <C />
    </Container>
  )

  withElement(A, a =>
    withElement(B, b => {
      t.is(a.querySelector('button')!.innerHTML, '101')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(a.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '102')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(b.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '102')
      t.is(b.querySelector('button')!.innerHTML, '2')
    })
  )
})

test('it should support custom effects', t => {
  t.plan(1)

  type State = {
    a: number
  }

  let { Container, withStore } = createConnectedStore({ a: 1 })

  let withEffects: Effects<State> = store => {
    store.on('a').subscribe(a => {
      t.is(a, 2)
    })
    return store
  }

  let C = withStore(({ store }) => (
    <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  ))
  let A = () => (
    <Container effects={withEffects}>
      <C />
    </Container>
  )

  withElement(A, _ => Simulate.click(_.querySelector('button')!))
})

test('it should eagerly throw at runtime when using a consumer without a container (createConnectedStore)', t => {
  let { withStore } = createConnectedStore({ a: 1 })
  let A = withStore(() => <div />)
  t.throws(() => withElement(A, _ => {}), /does not seem to be nested/)
})

test('it should re-render if a used model property changed', t => {
  let renderCount = 0
  let store: Store<{ a: number; b: number }>
  let S = createConnectedStore(
    {
      a: 1,
      b: 1
    },
    s => {
      store = s
      return s
    }
  )
  let A = S.withStore(({ store }) => {
    renderCount++
    return <>{store.get('a')}</>
  })
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )

  withElement(B, _ => {
    store.set('a')(2)
    store.set('a')(3)
    t.is(renderCount, 3)
  })
})

test('it should re-render if an unused model property changed', t => {
  let renderCount = 0
  let store: Store<{ a: number; b: number }>
  let S = createConnectedStore(
    {
      a: 1,
      b: 1
    },
    s => {
      store = s
      return s
    }
  )
  let A = S.withStore(({ store }) => {
    renderCount++
    return <>{store.get('a')}</>
  })
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')(2)
    store.set('b')(3)
    t.is(renderCount, 3)
  })
})

test('it should update even when unused fields change (get)', t => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo'
    },
    s => {
      store = s
      return s
    }
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      render() {
        renderCount++
        return (
          <>
            {this.props.store.get('a')}
            <button
              id="a"
              onClick={() =>
                this.props.store.set('a')(this.props.store.get('a') + 1)
              }
            />
            <button
              id="b"
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
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')('bar') // No render
    t.is(
      _.innerHTML,
      '0<button id="a"></button><button id="b"></button><span></span>'
    )
    Simulate.click(_.querySelector('#a')!) // Render
    t.is(
      _.innerHTML,
      '1<button id="a"></button><button id="b"></button><div>bar</div>'
    )
    Simulate.click(_.querySelector('#b')!) // Render
    t.is(
      _.innerHTML,
      '0<button id="a"></button><button id="b"></button><span></span>'
    )
    store.set('b')('baz') // Render
    t.is(
      _.innerHTML,
      '0<button id="a"></button><button id="b"></button><span></span>'
    )
    t.is(renderCount, 5)
  })
})

test('it should update even when unused fields change (get in lifecycle)', t => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo'
    },
    s => {
      store = s
      return s
    }
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
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
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0<span></span>')
    store.set('a')(1) // Render, and trigger shouldComponentUpdate
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 5)
  })
})

test('it should update even when unused fields change (getState in lifecycle 1)', t => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo'
    },
    s => {
      store = s
      return s
    }
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      shouldComponentUpdate(p: Props) {
        return p.store.getState().b !== this.props.store.get('b') || true
      }
      render() {
        renderCount++
        return this.props.store.get('a')
      }
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0')
    store.set('a')(1) // Render, and trigger shouldComponentUpdate
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 5)
  })
})

test('[stateful] it should update even when unused fields change (getState in lifecycle 2)', t => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo'
    },
    s => {
      store = s
      return s
    }
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      shouldComponentUpdate(p: Props) {
        return p.store.get('b') !== this.props.store.getState().b || true
      }
      render() {
        renderCount++
        return this.props.store.get('a')
      }
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')('bar') // No render
    t.is(_.innerHTML, '0')
    store.set('a')(1) // Render, and trigger shouldComponentUpdate
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 5)
  })
})

test('[stateful] it should update only when subscribed fields change (get in constructor)', t => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo'
    },
    s => {
      store = s
      return s
    }
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
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
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')('bar') // Render
    t.is(_.innerHTML, '0<span></span>')
    store.set('a')(1) // Render
    store.set('b')('a') // Render
    store.set('b')('b') // Render
    t.is(renderCount, 5)
  })
})

test('it should update when subscribed fields change (set in constructor)', t => {
  let S = createConnectedStore({
    a: 0
  })
  let renderCount = 0
  type Props = {
    store: Store<{ a: number }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        this.props.store.set('a')(1)
      }
      render() {
        renderCount++
        return <>{this.props.store.get('a')}</>
      }
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    t.is(_.innerHTML, '1')
    t.is(renderCount, 2)
  })
})

test('[stateful] it should update when any field changes (getState)', t => {
  let store: Store<{ a: number; b: string }>
  let S = createConnectedStore(
    {
      a: 0,
      b: 'foo'
    },
    s => {
      store = s
      return s
    }
  )
  let renderCount = 0
  type Props = {
    store: Store<{ a: number; b: string }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      render() {
        renderCount++
        return (
          <>
            {this.props.store.getState().a}
            <button
              id="a"
              onClick={() =>
                this.props.store.set('a')(this.props.store.get('a') + 1)
              }
            />
            <button
              id="b"
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
    }
  )
  let B = () => (
    <S.Container>
      <A />
    </S.Container>
  )
  withElement(B, _ => {
    store.set('b')('bar') // Render (this is the deoptimization when you use .getState)
    t.is(
      _.innerHTML,
      '0<button id="a"></button><button id="b"></button><span></span>'
    )
    Simulate.click(_.querySelector('#a')!) // Render
    t.is(
      _.innerHTML,
      '1<button id="a"></button><button id="b"></button><div>bar</div>'
    )
    Simulate.click(_.querySelector('#b')!) // Render
    t.is(
      _.innerHTML,
      '0<button id="a"></button><button id="b"></button><span></span>'
    )
    store.set('b')('baz') // Render
    t.is(
      _.innerHTML,
      '0<button id="a"></button><button id="b"></button><span></span>'
    )
    t.is(renderCount, 5)
  })
})

test("it should get the most up-to-date version of a field, even if Undux doesn't know the component depends on it", t => {
  t.plan(2)
  let S = createConnectedStore({
    a: 0
  })
  type Props = {
    store: Store<{ a: number }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        this.props.store.set('a')(1)
      }
      render() {
        return <>{this.props.store.get('a')}</>
      }
    }
  )
  let B = S.withStore(
    class extends React.Component<Props & { onClick(a: number): void }> {
      onClick = () => this.props.onClick(this.props.store.get('a'))
      render() {
        return (
          <>
            <button onClick={this.onClick} />
            <A />
          </>
        )
      }
    }
  )
  let C = () => (
    <S.Container>
      <B onClick={a => t.is(a, 1)} />
    </S.Container>
  )
  withElement(C, _ => {
    t.is(_.innerHTML, '<button></button>1')
    Simulate.click(_.querySelector('button')!)
  })
})

test('it should return the same value when call .get multiple times for one snapshot', t => {
  t.plan(4)
  let S = createConnectedStore({
    a: 0
  })
  type Props = {
    store: Store<{ a: number }>
  }
  let A = S.withStore(
    class extends React.Component<Props> {
      constructor(p: Props) {
        super(p)
        this.props.store.set('a')(1)
      }
      render() {
        return <>{this.props.store.get('a')}</>
      }
    }
  )
  let B = S.withStore(
    class extends React.Component<Props & { onClick(a: number): void }> {
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
    }
  )
  let call = 0
  let C = () => (
    <S.Container>
      <B
        onClick={a => {
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
    </S.Container>
  )
  withElement(C, _ => {
    t.is(_.innerHTML, '<button></button>1')
    Simulate.click(_.querySelector('button')!)
  })
})

test('it should return the same value when call .get multiple times for one snapshot, even when using shouldComponentUpdate', t => {
  let S = createConnectedStore({
    a: 'a'
  })
  let X = S.withStore(props => (
    <button onClick={() => props.store.set('a')('x')}>
      {props.store.get('a')}
    </button>
  ))
  let Y = S.withStore(props => (
    <button onClick={() => props.store.set('a')('y')}>
      {props.store.get('a')}
    </button>
  ))
  let Z = S.withStore(props => (
    <button onClick={() => props.store.set('a')('z')}>
      {props.store.get('a')}
    </button>
  ))
  let A = S.withStore(
    class extends React.Component<{ store: Store<{ a: string }> }> {
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
    }
  )
  let store: Store<{ a: string }>
  let Leak = S.withStore(props => {
    store = (props as any).store['storeDefinition']
    return null
  })
  let C = () => (
    <S.Container>
      <Leak />
      <A />
    </S.Container>
  )
  withElement(C, _ => {
    t.is(_.innerHTML, '<button>a</button>')
    t.is(store.get('a'), 'a')
    Simulate.click(_.querySelector('button')!)
    t.is(store.get('a'), 'x')
    t.is(_.innerHTML, '<button>x</button>')
    Simulate.click(_.querySelector('button')!)
    t.is(store.get('a'), 'y')
    t.is(_.innerHTML, '<button>y</button>')
    Simulate.click(_.querySelector('button')!)
    t.is(store.get('a'), 'z')
    t.is(_.innerHTML, 'z')
  })
})

test('it should fail for async updates by default', t => {
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
  let Leak = S.withStore(props => {
    store = (props as any).store['storeDefinition']
    return null
  })

  function C() {
    return (
      <S.Container>
        <Leak />
        <B />
      </S.Container>
    )
  }
  withElement(C, _ => {
    t.deepEqual(store.get('as'), [2])
  })
})

test('it should work for async updates using setFrom_EXPERIMENTAL', t => {
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
      this.props.store.setFrom_EXPERIMENTAL(store => {
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
  let Leak = S.withStore(props => {
    store = (props as any).store['storeDefinition']
    return null
  })

  function C() {
    return (
      <S.Container>
        <Leak />
        <B />
      </S.Container>
    )
  }
  withElement(C, _ => {
    t.deepEqual(store.get('as'), [0, 1, 2])
  })
})

test('setFrom_EXPERIMENTAL should compose', t => {
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
      this.props.store.setFrom_EXPERIMENTAL(store => {
        let as = store.get('as')
        store.set('as')([...as, index++])

        // One more time
        store.setFrom_EXPERIMENTAL(store => {
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
  let Leak = S.withStore(props => {
    store = (props as any).store['storeDefinition']
    return null
  })

  function C() {
    return (
      <S.Container>
        <Leak />
        <B />
      </S.Container>
    )
  }
  withElement(C, _ => {
    t.deepEqual(store.get('as'), [0, 1, 2, 3, 4, 5])
  })
})

test('setFrom_EXPERIMENTAL should chain', t => {
  type State = {
    as: number
  }
  let S = createConnectedStore<State>({ as: 0 })

  type Props = {
    store: Store<State>
  }
  class A extends React.Component<Props> {
    componentDidMount() {
      this.props.store.setFrom_EXPERIMENTAL(store =>
        store.set('as')(store.get('as') + 1)
      )
      this.props.store.setFrom_EXPERIMENTAL(store =>
        store.set('as')(store.get('as') + 1)
      )
      this.props.store.setFrom_EXPERIMENTAL(store =>
        store.set('as')(store.get('as') + 1)
      )
    }
    render() {
      return <div />
    }
  }
  let A1 = S.withStore(A)

  let store: Store<State>
  let Leak = S.withStore(props => {
    store = (props as any).store['storeDefinition']
    return null
  })

  function C() {
    return (
      <S.Container>
        <Leak />
        <A1 />
      </S.Container>
    )
  }
  withElement(C, _ => {
    t.deepEqual(store.get('as'), 3)
  })
})
