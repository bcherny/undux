import * as React from 'react'
import { Subscription } from 'rxjs'
import { createStore, EffectsAs, Store, StoreDefinition, StoreSnapshot } from '..'
import { Diff, getDisplayName, mapValues, some } from '../utils'

export type ConnectAs<States extends {
  [alias: string]: object
}> = {
  Container: React.ComponentType<ContainerPropsAs<States>>
  initialStates: States,
  withStores: <
    Props extends {[K in keyof States]: Store<States[K]>}
  >(
    Component: React.ComponentType<Props>
  ) => React.ComponentType<Diff<Props, {[K in keyof States]: Store<States[K]>}>>
}

export type ContainerPropsAs<States extends {
  [alias: string]: object
}> = {
  effects?: EffectsAs<States>
  initialStates?: States
}

export function createConnectedStoreAs<States extends {
  [alias: string]: object
}>(
  initialStates: States,
  effects?: EffectsAs<States>
): ConnectAs<States> {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)

  type ContainerState = {
    storeSnapshots: {
      [K in keyof States]: StoreSnapshot<States[K]>
    }
  }

  class Container extends React.Component<ContainerPropsAs<States>, ContainerState> {
    storeDefinitions: {
      [K in keyof States]: StoreDefinition<States[K]>
    }
    subscriptions: {
      [K in keyof States]: Subscription
    }
    constructor(props: ContainerPropsAs<States>) {
      super(props)

      // Create store definition from initial state
      let states = props.initialStates || initialStates
      this.storeDefinitions = mapValues(states, _ => createStore(_))

      // Apply effects?
      let fx = props.effects || effects
      if (fx) {
        fx(this.storeDefinitions)
      }

      this.state = {
        storeSnapshots: mapValues(this.storeDefinitions, _ => _.getCurrentSnapshot())
      }

      this.subscriptions = mapValues(
        this.storeDefinitions,
        (_, k) => _.onAll().subscribe(() =>
          this.setState({
            storeSnapshots: Object.assign(
              {},
              this.state.storeSnapshots,
              { [k]: _.getCurrentSnapshot() }
            )
          })
        )
      )
    }
    componentWillUnmount() {
      mapValues(this.subscriptions, _ => _.unsubscribe())
      // Let the state get GC'd.
      // TODO: Find a more elegant way to do this.
      mapValues(this.storeDefinitions, _ => (_ as any).storeSnapshot = null);
      (this as any).storeDefinitions = {}
    }
    render() {
      return <Context.Provider value={this.state.storeSnapshots}>
        {this.props.children}
      </Context.Provider>
    }
  }

  let Consumer = (props: {
    children: (stores: { [K in keyof States]: StoreSnapshot<States[K]> }) => JSX.Element
    displayName: string
  }) =>
    <Context.Consumer>
      {stores => {
        if (!isInitialized(stores)) {
          throw Error(`[Undux] Component "${props.displayName}" does not seem to be nested in an Undux <Container>. To fix this error, be sure to render the component in the <Container>...</Container> component that you got back from calling createConnectedStoreAs().`)
        }
        return props.children(stores)
      }}
    </Context.Consumer>

  function withStores<
    Props extends {[K in keyof States]: Store<States[K]>},
    PropsWithoutStore = Diff<Props, {[K in keyof States]: Store<States[K]>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let displayName = getDisplayName(Component)
    let f: React.StatelessComponent<PropsWithoutStore> = props =>
      <Consumer displayName={displayName}>
        {storeSnapshots => <SnapshotComponent
          Component={Component}
          props={props}
          storeSnapshots={storeSnapshots}
        />}
      </Consumer>
    f.displayName = `withStores(${displayName})`
    return f
  }

  return {
    Container,
    initialStates,
    withStores
  }
}

type SnapshotComponentProps<
  States extends {
    [alias: string]: object
  },
  Props extends {[K in keyof States]: Store<States[K]>}
> = {
  props: object
  Component: React.ComponentType<Props>
  storeSnapshots: {
    [K in keyof States]: StoreSnapshot<States[K]>
  }
}

class SnapshotComponent<
  States extends {
    [alias: string]: object
  },
  Props extends {[K in keyof States]: Store<States[K]>}
> extends React.Component<SnapshotComponentProps<States, Props>> {
  private isSubscribedToAllFields: Record<keyof States, boolean> = mapValues(this.props.storeSnapshots, () => false)
  // https://jsperf.com/set-membership-vs-object-key-lookup
  private subscribedFields: {
    [S in keyof States]?: Partial<Record<keyof S, true>>
   } = {}
  shouldComponentUpdate(nextProps: SnapshotComponentProps<States, Props>) {
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
      this.props.storeSnapshots,
      this.onGetOrSet,
      this.onGetAll
    )
    return <Component store={wrapper} {...props} />
  }
}

function isInitialized<State extends object>(
  store: StoreSnapshot<State> | {__MISSING_PROVIDER__: true}
) {
  return !('__MISSING_PROVIDER__' in store)
}
