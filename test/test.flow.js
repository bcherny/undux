// @flow strict-local
import { connect, connectAs, createConnectedStore, createConnectedStoreAs, createStore, withLogger, withReduxDevtools } from '../dist/src'
import type { Plugin, Store } from '../dist/src'
import * as React from 'react'
import { debounceTime, filter } from 'rxjs/operators'

type State = {|
  isTrue: boolean,
  users: string[]
|}

let initialState: State = {
  isTrue: true,
  users: []
}

let withEffects: Plugin<State> = store => {
  store.onAll().subscribe(({ key, value, previousValue }) => {
    key.toUpperCase()
    if (typeof previousValue === 'boolean' || typeof value === 'boolean') {
      !previousValue
      !value
    } else {
      previousValue.slice(0, 1)
      value.slice(0, 1)
    }
  })
  store.on('users').subscribe(_ => _.slice(0, 1))
  return store
}

let store = withEffects(withReduxDevtools(withLogger(createStore(initialState))))
let debugStore = createStore(initialState, { isDevMode: true })

let state = store.getState().users.concat(4)
let snapshot = store.getCurrentSnapshot().get('users').concat(4)

type Props = {|
  foo: number,
  bar: string
|}

type StoreProps = {|
  store: Store<State>
|}

type PropsWithStore = {|
  ...StoreProps,
  ...Props
|}

/////////////////// A ///////////////////

let A = connect(store)(({ store }: StoreProps) =>
  <div>
    {store.get('isTrue') ? 'True' : 'False'}
    <button onClick={() => store.set('isTrue')(false)}>Update</button>
  </div>
)
let a = <A />

/////////////////// B ///////////////////

let BRaw = ({ foo, bar }: PropsWithStore) =>
  <div>
    {foo}
    {bar}
  </div>
let B = connect(store)(BRaw)
let b = <B foo={1} bar='baz' />

/////////////////// C ///////////////////

let C = connect(store)(({ foo, bar }: PropsWithStore) =>
  <div>
    {foo}
    {bar}
  </div>
)
let c = <C foo={1} bar='baz' />

/////////////////// D ///////////////////

let D = connect(store)(class extends React.Component<StoreProps> {
  render() {
    return <div>
      {this.props.store.get('isTrue') ? 'True' : 'False'}
      <button onClick={() => this.props.store.set('isTrue')(false)}>Update</button>
    </div>
  }
})
let d = <D />

/////////////////// E ///////////////////

let E = connect(store)(class extends React.Component<PropsWithStore> {
  render() {
    return <div>
      {this.props.store.get('isTrue') ? 'True' : 'False'}
      {this.props.foo}
      {this.props.bar}
    </div>
  }
})
let e = <E foo={1} bar='baz' />

/////////////////// F ///////////////////

store
  .on('isTrue')
  .pipe(
    debounceTime(100),
    filter(_ => _ !== true)
  )
  .subscribe(_ => _ === false)

store.get('isTrue')
store.set('isTrue')
store.set('isTrue')(false)

store.onAll().subscribe(_ => {
  _.key === 'isTrue'
  _.previousValue === false
  _.value === true
})

/////////////////// connectAs ///////////////////

type CombinedA = {| a: number |}
type CombinedB = {| b: string |}

let initA: CombinedA = { a: 1 }
let initB: CombinedB = { b: 'c' }

let storeA = createStore(initA)
let storeB = createStore(initB)

type CombinedComponentProps = {|
  a: Store<CombinedA>,
  b: Store<CombinedB>
|}

type CombinedAugmentedComponentProps = {|
  ...CombinedComponentProps,
  x: number
|}

/////////////////// createConnectedStore ///////////////////

let StoreC = createConnectedStore({
  a: 1,
  b: 2
})

type StoreCProps = {|
  store: Store<{| a: number, b: number |}>
|}

let StoreCElement = StoreC.withStore(class extends React.Component<StoreCProps> {
  render() {
    return <div>
      {this.props.store.get('a') + 1}
      <button onClick={() => this.props.store.set('b')(10)}>Update</button>
    </div>
  }
})

let StoreCContainer = () =>
  <StoreC.Container>
    <StoreCElement />
  </StoreC.Container>

/////////////////// createConnectedStoreAs ///////////////////

let StoreD = createConnectedStoreAs({
  D: {
    a: 1,
    b: 2
  },
  E: {
    c: 'x'
  }
})

type StoreDProps = {|
  D: Store<{| a: number, b: number |}>,
  E: Store<{| c: string |}>
|}

let StoreDElement = StoreD.withStores(class extends React.Component<StoreDProps> {
  render() {
    return <div>
      {this.props.D.get('a') + 1}
      {this.props.E.get('c') + 'y'}
      <button onClick={() => this.props.D.set('b')(10)}>Update</button>
    </div>
  }
})

let StoreDContainer = () =>
  <StoreD.Container>
    <StoreDElement />
  </StoreD.Container>

//// Functional component

let CombinedComponent = ({a, b}: CombinedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
  </div>

let ConnectedCombinedComponent = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent)

let ca = <ConnectedCombinedComponent />

//// Functional component (additional props)

let CombinedComponent1 = ({a, b, x}: CombinedAugmentedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
    {x * 3}
  </div>

let ConnectedCombinedComponent1 = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent1)

let ca1 = <ConnectedCombinedComponent1 x={1} />

//// Functional component (inline)

let ConnectedCombinedComponent2 = connectAs({
  a: storeA,
  b: storeB
})(({a, b}: CombinedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
  </div>
)

let ca2 = <ConnectedCombinedComponent2 />

//// Functional component (inline, additional props)

let ConnectedCombinedComponent3 = connectAs({
  a: storeA,
  b: storeB
})(({a, b, x}: CombinedAugmentedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
    {x*3}
  </div>
)

let ca3 = <ConnectedCombinedComponent3 x={4} />

//// Class component

class CombinedComponent10 extends React.Component<CombinedComponentProps> {
  render() {
    return <div>
      {this.props.a.get('a') * 4}
      {this.props.b.get('b').concat('d')}
    </div>
  }
}

let ConnectedCombinedComponent10 = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent10)

let ca10 = <ConnectedCombinedComponent10 />

//// Class component (additional props)

class CombinedComponent11 extends React.Component<CombinedAugmentedComponentProps> {
  render() {
    return <div>
      {this.props.a.get('a') * 4}
      {this.props.b.get('b').concat('d')}
      {this.props.x * 3}
    </div>
  }
}

let ConnectedCombinedComponent11 = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent11)

let ca11 = <ConnectedCombinedComponent11 x={10} />

//// Class component (inline)

let ConnectedCombinedComponent12 = connectAs({
  a: storeA,
  b: storeB
})(class extends React.Component<CombinedComponentProps> {
  render() {
    return <div>
      {this.props.a.get('a') * 4}
      {this.props.b.get('b').concat('d')}
    </div>
  }
})

let ca12 = <ConnectedCombinedComponent12 />

//// Class component (inline, additional props)

let ConnectedCombinedComponent13 = connectAs({
  a: storeA,
  b: storeB
})(class extends React.Component<CombinedAugmentedComponentProps> {
  render() {
    return <div>
      {this.props.a.get('a') * 13}
      {this.props.b.get('b').concat('d')}
      {this.props.x * 3}
    </div>
  }
})

let ca13 = <ConnectedCombinedComponent13 x={4} />
