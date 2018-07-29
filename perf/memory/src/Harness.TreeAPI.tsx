import * as React from 'react'
import { Store } from '../../../src'
import { createConnectedStore } from '../../../src/react/createConnectedStore'
import { MemoryHog } from './MemoryHog.TreeAPI'

type State = {
  visibleComponent: 'a' | 'b'
}

let { Container, withStore } = createConnectedStore<State>({ visibleComponent: 'a' })

let A = () => <MemoryHog />
let B = () => <MemoryHog />

type Props = {
  store: Store<State>
}

let HarnessRaw = withStore(class HarnessRaw extends React.Component<Props> {
  onClick = () => {
    let a: 'a' | 'b' = this.props.store.get('visibleComponent') === 'a' ? 'b' : 'a'
    this.props.store.set('visibleComponent')(a)
  }
  render() {
    return <>
      {this.props.store.get('visibleComponent') === 'a'
        ? <A />
        : <B />
      }
      <button onClick={this.onClick}>Unmount</button>
    </>
  }
})

export let Harness: React.StatelessComponent = () =>
  <Container><HarnessRaw /></Container>

Harness.displayName = 'Harness'
