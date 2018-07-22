import * as React from 'react'
import { connect, createStore, Store } from '../../../src'

type X = {x: 1}

type State = {
  a: X[]
}

let store = createStore<State>({ a: [{ x: 1 }] })
let withStore = connect(store)

type Props = {
  store: Store<State>
}

export let MemoryHog = withStore(class MemoryHogRaw extends React.Component<Props> {
  onClick = () => {
    // Allocate a bunch of memory
    let a: X[] = []
    let i = 100000
    while (i--) a.push({ x: 1 })
    this.props.store.set('a')(a)
  }
  render() {
    return <button onClick={this.onClick}>Allocate</button>
  }
})
MemoryHog.displayName = 'MemoryHog'
