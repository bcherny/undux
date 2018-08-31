import * as React from 'react'
import { Subscription } from 'rxjs'
import { createStore, Effects, Store, StoreDefinition, StoreSnapshot, StoreSnapshotWrapper } from '..'
import { Diff, equals, getDisplayName } from '../utils'

export type Connect<State extends object> = {
  Container: React.ComponentType<ContainerProps<State>>
  withStore: <
    Props extends {store: Store<State>}
  >(
    Component: React.ComponentType<Props>
  ) => React.ComponentType<Diff<Props, {store: Store<State>}>>
}

export type ContainerProps<State extends object> = {
  effects?: Effects<State>
  initialState?: State
}

export function createConnectedStore<State extends object>(
  initialState: State,
  effects?: Effects<State>
): Connect<State> {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)

  type SubscriptionKeys = keyof State | '<all>'

  type ContainerState = {
    storeDefinition: StoreDefinition<State> | null
    storeSnapshotWrapper: StoreSnapshotWrapper<State> | null
  }

  class Container extends React.Component<ContainerProps<State>, ContainerState> {
    constructor(props: ContainerProps<State>) {
      super(props)

      // Create store definition from initial state
      let state = props.initialState || initialState
      let storeDefinition = createStore(state)

      // Apply effects?
      let fx = props.effects || effects
      if (fx) {
        fx(storeDefinition)
      }

      this.state = {
        storeDefinition,
        storeSnapshotWrapper: new StoreSnapshotWrapper(
          storeDefinition.getCurrentSnapshot(),
          this.onGetOrSet,
          this.onGetAll
        )
      }
    }
    subscriptions: Map<SubscriptionKeys, Subscription> = new Map
    onGetOrSet = (field: keyof State) => {
      if (this.subscriptions.has(field) || this.subscriptions.has('<all>')) {
        return
      }
      let {storeDefinition, storeSnapshotWrapper} = this.state
      if (!storeDefinition || !storeSnapshotWrapper) {
        return
      }
      let newSubscriptions = new Map(this.subscriptions)
      newSubscriptions.set(
        field,
        storeDefinition.on(field).subscribe(value => {
          let {storeDefinition, storeSnapshotWrapper} = this.state
          if (!storeDefinition || !storeSnapshotWrapper) {
            return
          }
          if (equals(value, storeSnapshotWrapper.get(field))) {
            return
          }
          this.setState({
            storeSnapshotWrapper: new StoreSnapshotWrapper(
              storeDefinition.getCurrentSnapshot(),
              this.onGetOrSet,
              this.onGetAll
            )
          })
        })
      )
      this.subscriptions = newSubscriptions
    }
    onGetAll = () => {
      if (this.subscriptions.has('<all>')) {
        return
      }
      let {storeDefinition, storeSnapshotWrapper} = this.state
      if (!storeDefinition || !storeSnapshotWrapper) {
        return
      }
      let newSubscriptions = new Map
      newSubscriptions.set(
        '<all>',
        storeDefinition.onAll().subscribe(({ key, previousValue, value }) => {
          let {storeDefinition} = this.state
          if (!storeDefinition) {
            return
          }
          if (equals(previousValue, value)) {
            return
          }
          this.setState({
            storeSnapshotWrapper: new StoreSnapshotWrapper(
              storeDefinition.getCurrentSnapshot(),
              this.onGetOrSet,
              this.onGetAll
            )
          })
        })
      )
      // TODO: Find a way to test this. React batches render() calls,
      // so it's hard to test that this actually prevents extra re-renders.
      this.clearSubscriptions()
      this.subscriptions = newSubscriptions
    }
    clearSubscriptions() {
      this.subscriptions.forEach(_ => _.unsubscribe())
    }
    componentWillUnmount() {
      this.clearSubscriptions();
      // Let the state get GC'd.
      // TODO: Find a more elegant way to do this.
      (this.state.storeSnapshotWrapper as any).state = null;
      (this.state.storeSnapshotWrapper as any).storeDefinition = null;
      (this.state.storeDefinition as any).storeSnapshot = null
    }
    render() {
      return <Context.Provider value={this.state.storeSnapshotWrapper}>
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
          throw Error(`[Undux] Component "${props.displayName}" does not seem to be nested in an Undux <Container>. To fix this error, be sure to render the component in the <Container>...</Container> component that you got back from calling createConnectedStore().`)
        }
        return props.children(store)
      }}
    </Context.Consumer>

  function withStore<
    Props extends {store: Store<State>},
    PropsWithoutStore = Diff<Props, {store: Store<State>}>
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
