import * as React from 'react'
import { Subscription } from 'rxjs'
import { createStore, Effects, Store, StoreDefinition, StoreSnapshot, StoreSnapshotWrapper } from '..'
import { Diff, equals, getDisplayName, keys, some } from '../utils'

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

  type ContainerState = {
    storeSnapshot: StoreSnapshot<State>
  }

  class Container extends React.Component<ContainerProps<State>, ContainerState> {
    subscription: Subscription
    storeDefinition: StoreDefinition<State>
    constructor(props: ContainerProps<State>) {
      super(props)

      // Create store definition from initial state
      let state = props.initialState || initialState
      this.storeDefinition = createStore(state)

      // Apply effects?
      let fx = props.effects || effects
      if (fx) {
        fx(this.storeDefinition)
      }

      this.state = {
        storeSnapshot: this.storeDefinition.getCurrentSnapshot()
      }

      this.subscription = this.storeDefinition.onAll().subscribe(() =>
        this.setState({ storeSnapshot: this.storeDefinition.getCurrentSnapshot() })
      )
    }
    componentWillUnmount() {
      this.subscription.unsubscribe();
      // Let the state get GC'd.
      // TODO: Find a more elegant way to do this.
      (this.storeDefinition as any).storeSnapshot = null;
      (this as any).storeDefinition = null
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
        {storeSnapshot => <SnapshotComponent
          Component={Component}
          props={props}
          storeSnapshot={storeSnapshot}
        />}
      </Consumer>
    f.displayName = `withStore(${displayName})`
    return f
  }

  return {
    Container,
    withStore
  }
}

type SnapshotComponentProps<
  State extends Object,
  Props extends {store: Store<State>}
> = {
  props: object
  Component: React.ComponentType<Props>
  storeSnapshot: StoreSnapshot<State>
}

class SnapshotComponent<
  State extends Object,
  Props extends {store: Store<State>}
> extends React.Component<SnapshotComponentProps<State, Props>> {
  private isSubscribedToAllFields = false
  // https://jsperf.com/set-membership-vs-object-key-lookup
  private subscribedFields: Partial<Record<keyof State, true>> = {}
  shouldComponentUpdate(nextProps: SnapshotComponentProps<State, Props>) {
    if (this.isSubscribedToAllFields) {
      return true
    }
    return some(
      this.subscribedFields,
      (_, k) => !equals(nextProps.storeSnapshot.get(k), this.props.storeSnapshot.get(k))
    ) || some(
      nextProps.props,
      (v, k) => !equals(v, this.props.props[k])
    )
  }
  onGetOrSet = (key: keyof State) => {
    if (this.isSubscribedToAllFields) {
      return
    }
    this.subscribedFields[key] = true
  }
  onGetAll = () => {
    this.isSubscribedToAllFields = true
    this.subscribedFields = {}
  }
  render() {
    let {Component, props} = this.props
    let wrapper = new StoreSnapshotWrapper(
      this.props.storeSnapshot,
      this.onGetOrSet,
      this.onGetAll,
      this.subscribedFields,
      this.isSubscribedToAllFields
    )
    return <Component store={wrapper} {...props} />
  }
}

function isInitialized<State extends object>(
  store: StoreSnapshot<State> | {__MISSING_PROVIDER__: true}
) {
  return !('__MISSING_PROVIDER__' in store)
}
