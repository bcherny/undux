import * as React from 'react'
import { ComponentClass } from 'react'
import { Subscription } from 'rxjs'
import { createStore, Store, StoreDefinition, StoreSnapshot } from './'
import { equals, getDisplayName, keys, mapValues, some } from './utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

type F<StoreState extends object> = (<
  Props,
  PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
>(
  Component: React.ComponentType<PropsWithStore>
) => React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>>)

type Connect<StoreState extends object> = {
  Consumer: F<StoreState>
  Provider: F<StoreState>
}

type Identity = <A>(a: A) => A
let identity: Identity = a => a

export function connect<
  StoreState extends object
>(
  storeState: StoreState,
  f: (store: StoreDefinition<StoreState>) => StoreDefinition<StoreState> = identity
): Connect<StoreState> {

  let store = f(createStore(storeState))

  let Consumer = <
    Props extends object,
    PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
  >(
    Component: React.ComponentType<PropsWithStore>
  ): React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> => {
    return createConnect<StoreState, Props, PropsWithStore>(store, Component, false)
  }

  let Provider = <
    Props extends object,
    PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
  >(
    Component: React.ComponentType<PropsWithStore>
  ): React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> => {
    return createConnect<StoreState, Props, PropsWithStore>(store, Component, true)
  }

  return {
    Consumer,
    Provider
  }
}

type State<StoreState extends object> = {
  store: StoreSnapshot<StoreState>
  subscription: Subscription
}

function createConnect<
  StoreState extends object,
  Props extends object,
  PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
>(
  store: StoreDefinition<StoreState>,
  Component: React.ComponentType<PropsWithStore>,
  isRoot: boolean
) {
  return class extends React.Component<Diff<PropsWithStore, { store: Store<StoreState> }>, State<StoreState>> {
    static displayName = `withStore(${getDisplayName(Component)})`
    constructor(props: any) {
      super(props)
      let snap = store.getCurrentSnapshot()
      if (!snap) {
        // This means we tried to mount an HOC after its store was already GC'd
        throw 'cant even'
      }
      this.state = {
        store: snap,
        subscription: store.onAll().subscribe(({ previousValue, value }) => {
          if (equals(previousValue, value)) {
            return false
          }
          let snap = store.getCurrentSnapshot()
          if (!snap) {
            // This means the store was GC'd before this component was unmounted
            throw 'cant even'
          }
          this.setState({ store: snap })
        })
      }
    }
    componentWillUnmount() {
      this.state.subscription.unsubscribe()
      if (isRoot) {
        store.gc()
      }
    }
    shouldComponentUpdate(props: Readonly<Diff<PropsWithStore, { store: Store<StoreState> }>>, state: State<StoreState>) {
      return state.store !== this.state.store
        || Object.keys(props).some(_ => (props as any)[_] !== (this.props as any)[_])
    }
    render() {
      return <Component {...this.props} store={this.state.store} />
    }
  }
}

function createConnects<
  Props extends object,
  StoreStates extends {[alias: string]: object},
  Stores extends {
    [K in keyof StoreStates]: StoreDefinition<StoreStates[K]>
  } = {
    [K in keyof StoreStates]: StoreDefinition<StoreStates[K]>
  },
  StoreSnapshots extends {
    [K in keyof StoreStates]: StoreSnapshot<StoreStates[K]>
  } = {
    [K in keyof StoreStates]: StoreSnapshot<StoreStates[K]>
  }
>(
  stores: Stores,
  Component: React.ComponentType<{
    [K in keyof Stores]: StoreSnapshot<Stores[K]>
  } & Props>,
  isRoot: boolean
) {
  type State = {
    stores: {
      [K in keyof Stores]: ReturnType<Stores[K]['getCurrentSnapshot']>
    }
    subscriptions: Subscription[]
  }
  return class extends React.Component<Diff<Props, Stores>, State> {
    static displayName = `withStore(${getDisplayName(Component)})`

    state: State = {
      stores: mapValues(stores, _ =>
        _.getCurrentSnapshot() as ReturnType<(typeof _)['getCurrentSnapshot']>
      ),
      subscriptions: keys(stores).map(k =>
        stores[k].onAll().subscribe(({ previousValue, value }) => {
          if (equals(previousValue, value)) {
            return false
          }
          this.setState({
            stores: Object.assign({}, this.state.stores as any, {[k]: stores[k].getCurrentSnapshot()})
          })
        })
      )
    }
    componentWillUnmount() {
      this.state.subscriptions.forEach(_ => _.unsubscribe())
    }
    shouldComponentUpdate(props: Diff<Props, Stores>, state: State) {
      return some(state.stores, (s, k) => s !== this.state.stores[k])
        || Object.keys(props).some(_ => (props as any)[_] !== (this.props as any)[_])
    }
    render() {
      return <Component {...this.props} {...this.state.stores} />
    }
  }
}

type FAs<A extends object> = <
  Props extends object,
  Stores extends {[alias: string]: object}
>(
  Component: React.ComponentType<{
    [K in keyof Stores]: StoreSnapshot<Stores[K]>
  } & Props>
) => React.ComponentClass<Diff<Props, Stores>>

type ConnectAs<Stores extends {[alias: string]: object}> = {
  Consumer: FAs<Stores>
  Provider: FAs<Stores>
}

export function connectAs<
  StoreStates extends {[alias: string]: object}
>(
  storeStates: StoreStates,
  f?: (s: {[K in keyof StoreStates]: StoreDefinition<StoreStates[K]>}) => {[K in keyof StoreStates]: StoreDefinition<StoreStates[K]>}
): ConnectAs<StoreStates> {

  let stores = mapValues(storeStates, _ => createStore(_))
  if (f) {
    stores = f(stores)
  }

  let Consumer = <
    Props extends object
  >(
    Component: React.ComponentType<{
      [K in keyof StoreStates]: StoreSnapshot<StoreStates[K]>
    } & Props>
  ): React.ComponentClass<Diff<Props, StoreStates>> => {
    return createConnects<Props, StoreStates>(stores, Component, false)
  }

  let Provider = <
    Props extends object
  >(
    Component: React.ComponentType<{
      [K in keyof StoreStates]: StoreSnapshot<StoreStates[K]>
    } & Props>
  ): React.ComponentClass<Diff<Props, StoreStates>> => {
    return createConnects<Props, StoreStates>(stores, Component, true)
  }

  return {
    Consumer,
    Provider
  }
}

// export function connectAs<
//   Stores extends {[alias: string]: StoreDefinition<any>}
// >(
//   stores: Stores
// ) {
//   return function<Props extends object>(
//     Component: React.ComponentType<{
//       [K in keyof Stores]: ReturnType<Stores[K]['toStore']>
//     } & Props>
//   ): React.ComponentClass<Diff<Props, Stores>> {

//     type State = {
//       stores: {
//         [K in keyof Stores]: ReturnType<Stores[K]['getCurrentSnapshot']>
//       }
//       subscriptions: Subscription[]
//     }

//     return class extends React.Component<Diff<Props, Stores>, State> {
//       static displayName = `withStore(${getDisplayName(Component)})`
//       state = {
//         stores: mapValues(stores, _ =>
//           _.getCurrentSnapshot() as ReturnType<(typeof _)['getCurrentSnapshot']>
//         ),
//         subscriptions: keys(stores).map(k =>
//           stores[k].onAll().subscribe(({ previousValue, value }) => {
//             if (equals(previousValue, value)) {
//               return false
//             }
//             this.setState({
//               stores: Object.assign({}, this.state.stores as any, {[k]: stores[k].getCurrentSnapshot()})
//             })
//           })
//         )
//       }
//       componentWillUnmount() {
//         this.state.subscriptions.forEach(_ => _.unsubscribe())
//       }
//       shouldComponentUpdate(props: Diff<Props, Stores>, state: State) {
//         return some(state.stores, (s, k) => s !== this.state.stores[k])
//           || Object.keys(props).some(_ => (props as any)[_] !== (this.props as any)[_])
//       }
//       render() {
//         return <Component {...this.props} {...this.state.stores} />
//       }
//     }
//   }
// }
