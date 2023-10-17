import * as React from 'react'
import { Subscription } from 'rxjs'
import {
  createStore,
  EffectsAs,
  Store,
  StoreDefinition,
  StoreSnapshot
} from '..'
import { Diff, getDisplayName, mapValues } from '../utils'

export type CreateConnectedStoreAs<
  States extends {
    [alias: string]: any
  }
> = {
  Container: React.ComponentType<ContainerPropsAs<States>>
  useStores(): { [K in keyof States]: Store<States[K]> }
  withStores: <Props extends { [K in keyof States]: Store<States[K]> }>(
    Component: React.ComponentType<Props>
  ) => React.ComponentType<
    Diff<Props, { [K in keyof States]: Store<States[K]> }>
  >
}

export type ContainerPropsAs<
  States extends {
    [alias: string]: any
  }
> = {
  effects?: EffectsAs<States>
  initialStates?: States
}

export function createConnectedStoreAs<
  States extends {
    [alias: string]: any
  }
>(
  initialStates: States,
  effects?: EffectsAs<States>
): CreateConnectedStoreAs<States> {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)

  type ContainerState = {
    storeSnapshots: { [K in keyof States]: StoreSnapshot<States[K]> | null }
  }

  class Container extends React.Component<
    ContainerPropsAs<States>,
    ContainerState
  > {
    storeDefinitions: { [K in keyof States]: StoreDefinition<States[K]> }
    subscriptions: { [K in keyof States]: Subscription } | null

    constructor(props: ContainerPropsAs<States>) {
      super(props)

      // Create store definition from initial state
      let states = props.initialStates || initialStates
      let stores = mapValues(states, _ => createStore(_))

      // Apply effects?
      let fx = props.effects || effects
      if (fx) {
        fx(stores as any) // TODO
      }

      this.storeDefinitions = stores as any
      this.subscriptions = this._createSubscriptions()
      this.state = {
        // TODO
        storeSnapshots: mapValues(stores, _ => _.getCurrentSnapshot()) as any
      }
    }

    _createSubscriptions = () =>
      mapValues(this.storeDefinitions, (_, k) =>
        _.onAll().subscribe(() =>
          this.setState(state => ({
            storeSnapshots: Object.assign({}, state.storeSnapshots, {
              [k]: _.getCurrentSnapshot()
            })
          }))
        )
      ) as any

    componentDidMount(): void {
      if (this.subscriptions == null) {
        this.subscriptions = this._createSubscriptions()
      }
    }

    componentWillUnmount() {
      if (this.subscriptions != null) {
        mapValues(this.subscriptions, _ => _.unsubscribe())
        this.subscriptions = null
      }
    }

    render() {
      return (
        <Context.Provider value={this.state.storeSnapshots}>
          {this.props.children}
        </Context.Provider>
      )
    }
  }

  let Consumer = (props: {
    children: (
      stores: { [K in keyof States]: StoreSnapshot<States[K]> }
    ) => JSX.Element
    displayName: string
  }) => (
    <Context.Consumer>
      {stores => {
        if (!isInitialized(stores)) {
          throw Error(
            `[Undux] Component "${props.displayName}" does not seem to be nested in an Undux <Container>. To fix this error, be sure to render the component in the <Container>...</Container> component that you got back from calling createConnectedStoreAs().`
          )
        }
        return props.children(stores)
      }}
    </Context.Consumer>
  )

  function withStores<
    Props extends { [K in keyof States]: Store<States[K]> },
    PropsWithoutStore = Diff<Props, { [K in keyof States]: Store<States[K]> }>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let displayName = getDisplayName(Component)
    let f: React.StatelessComponent<PropsWithoutStore> = props => (
      <Consumer displayName={displayName}>
        {stores => <Component {...stores} {...(props as any)} />}
      </Consumer>
    )
    f.displayName = `withStores(${displayName})`
    return f
  }

  return {
    Container,
    useStores() {
      return React.useContext(Context)
    },
    withStores
  }
}

function isInitialized<State extends object>(
  store: StoreSnapshot<State> | { __MISSING_PROVIDER__: true }
) {
  return !('__MISSING_PROVIDER__' in store)
}
