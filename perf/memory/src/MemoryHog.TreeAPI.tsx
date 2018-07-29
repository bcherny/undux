import * as React from 'react'
import { Store } from '../../../src'
import { createConnectedStore } from '../../../src/react/createConnectedStore'

type X = {x: 1}

type State = {
  a: X[]
}

let { Container, withStore } = createConnectedStore<State>({ a: [{ x: 1 }] })

type Props = {
  store: Store<State>
}

let MemoryHogRaw = withStore(class MemoryHogRaw extends React.Component<Props> {
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

export let MemoryHog: React.StatelessComponent = () =>
  <Container><MemoryHogRaw /></Container>
MemoryHog.displayName = 'MemoryHog'
