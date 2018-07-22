import * as React from 'react'
import { Subscription } from 'rxjs'
import { createStore, Store, StoreDefinition, StoreSnapshot } from '..'
import { getDisplayName } from '../utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

export type Effect<State extends object> = (store: StoreDefinition<State>) => StoreDefinition<State>

export type Connect<State extends object> = {
  Container: React.ComponentType<ContainerProps<State>>
  withStore: <
    Props extends {store: Store<State>},
    PropsWithoutStore extends Diff<Props, {store: Store<State>}>
  >(
    Component: React.ComponentType<Props>
  ) => React.ComponentType<PropsWithoutStore>
}

export type ContainerProps<State extends object> = {
  effects?: Effect<State>
  initialState?: State
}

export function connectToTree<State extends object>(
  initialState: State
): Connect<State> {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)

  type ContainerState = {
    storeDefinition: StoreDefinition<State> | null
    storeSnapshot: StoreSnapshot<State> | null
    subscription: Subscription
  }

  class Container extends React.Component<ContainerProps<State>, ContainerState> {
    constructor(props: ContainerProps<State>) {
      super(props)

      let state = props.initialState || initialState
      let store = createStore(state)
      if (props.effects) {
        store = props.effects(store)
      }

      this.state = {
        storeDefinition: store,
        storeSnapshot: store.getCurrentSnapshot(),
        subscription: store.onAll().subscribe(() =>
          this.setState({ storeSnapshot: store.getCurrentSnapshot() })
        )
      }
    }
    componentWillUnmount() {
      this.state.subscription.unsubscribe();
      // Let the state get GC'd.
      // TODO: Find a more elegant way to do this.
      (this.state.storeSnapshot as any).state = null;
      (this.state.storeSnapshot as any).storeDefinition = null;
      (this.state.storeDefinition as any).storeSnapshot = null
    }
    render() {
      return <Context.Provider value={this.state.storeSnapshot}>
        {this.props.children}
      </Context.Provider>
    }
  }

  let Consumer = (props: {
    children: (store: StoreSnapshot<State>) => JSX.Element
    displayName: string
  }) =>
    <Context.Consumer>
      {store => {
        if (!isInitialized(store)) {
          throw Error(`Component "${props.displayName}" is not nested in a <Container>. To fix this error, be sure to render the component in a <Container>...</Container> tag.`)
        }
        return props.children(store)
      }}
    </Context.Consumer>

  function withStore<
    Props extends {store: Store<State>},
    PropsWithoutStore extends Diff<Props, {store: Store<State>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let displayName = getDisplayName(Component)
    let f: React.StatelessComponent<PropsWithoutStore> = props =>
      <Consumer displayName={displayName}>
        {store => <Component store={store} {...props} />}
      </Consumer>
    f.displayName = `withStore(${displayName})`
    return f
  }

  return {
    Container,
    withStore
  }
}

function isInitialized<State extends object>(
  store: StoreSnapshot<State> | {__MISSING_PROVIDER__: true}
) {
  return !('__MISSING_PROVIDER__' in store)
}
