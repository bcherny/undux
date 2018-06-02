// @flow strict-local
import { connect, connectAs, createStore, withLogger, withReduxDevtools } from '../dist/src'
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

let CombinedComponent = ({a, b}: CombinedComponentProps) =>
  <div>
    {a.get('a') * 4}
    {b.get('b').concat('d')}
  </div>

let ConnectedCombinedComponent = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent)

class CombinedComponent2 extends React.Component<CombinedComponentProps> {
  render() {
    return <div>
      {this.props.a.get('a') * 4}
      {this.props.b.get('b').concat('d')}
    </div>
  }
}

let ConnectedCombinedComponent2 = connectAs({
  a: storeA,
  b: storeB
})(CombinedComponent2)
