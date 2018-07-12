import * as React from 'react'
import { ComponentClass } from 'react'
import { Subscription } from 'rxjs'
import { ALL } from 'typed-rx-emitter'
import { createStore, Store, StoreDefinition, StoreSnapshot, StoreSnapshotWithSubscription } from '../'
import { equals, getDisplayName, keys, mapValues, some } from '../utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

const ALL: ALL = '__ALL__'

type Effect<State extends object> = (store: StoreDefinition<State>) => StoreDefinition<State>

export function connectToTreeAs<State extends object>(
  initialState: State
) {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)

  type ContainerProps = {
    effects?: Effect<State>[]
    initialState?: State
  }

  type ContainerState = {
    storeDefinition: StoreDefinition<State>
    storeSnapshot: StoreSnapshot<State>
    subscription: Subscription
  }

  let Container = class extends React.Component<ContainerProps, ContainerState> {
    constructor(p: ContainerProps) {
      super(p)

      let effects = p.effects || []
      let state = p.initialState || initialState
      let store = effects.reduce(
        (store, e) => e(store),
        createStore(state)
      )

      this.state = {
        storeDefinition: store,
        storeSnapshot: store.getCurrentSnapshot(),
        subscription: store.onAll().subscribe(() =>
          this.setState({ storeSnapshot: store.getCurrentSnapshot() })
        )
      }
    }
    componentWillUnmount() {
      this.state.subscription.unsubscribe()
    }
    render() {
      return <Context.Provider value={this.state.storeSnapshot}>
        {this.props.children}
      </Context.Provider>
    }
  }

  let Consumer = (props: {
    children: (store: StoreSnapshot<State>) => JSX.Element
  }) =>
    <Context.Consumer>
      {store => {
        if (!isInitialized(store)) {
          throw Error('Component is not nested in a <Container>!')
        }
        return props.children(store)
      }}
    </Context.Consumer>

  function withStore<
    Props extends {store: StoreSnapshot<State>},
    PropsWithoutStore extends Diff<Props, {store: StoreSnapshot<State>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let f = (props: PropsWithoutStore) => <Consumer>
      {store => <Component store={store} {...props} />}
    </Consumer>
    (f as any).displayName = 'withStore(' + getDisplayName(Component) + ')'
    return f
  }

  let result = {
    Container,
    withStore
  }
}

function isInitialized<State extends object>(
  store: StoreSnapshot<State> | {__MISSING_PROVIDER__: true}
) {
  return !('__MISSING_PROVIDER__' in store)
}
