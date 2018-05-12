// @flow
import { connect, createStore, withLogger, withReduxDevtools } from '../dist/src'
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
  store.on('users').subscribe(_ => _.slice(0, 1))
  return store
}

let store = withEffects(withReduxDevtools(withLogger(createStore(initialState))))

type Props = {|
  foo: number,
  bar: string
|}

type StoreProps = {|
  store: Store<State>
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

let BRaw = ({ foo, bar }: Props) =>
  <div>
    {foo}
    {bar}
  </div>
let B = connect(store)(BRaw)
let b = <B foo={1} bar='baz' />

/////////////////// C ///////////////////

let C = connect(store)(({ foo, bar }: Props) =>
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

let E = connect(store)(class extends React.Component<StoreProps & Props> {
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

store.before('isTrue').subscribe(_ => {
  _ === true
})

store.beforeAll().subscribe(_ => {
  _.key === 'isTrue'
  _.previousValue === false
  _.value === true
})

store.onAll().subscribe(_ => {
  _.key === 'isTrue'
  _.previousValue === false
  _.value === true
})
