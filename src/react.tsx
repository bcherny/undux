import * as React from 'react'
import { ComponentClass } from 'react'
import { Subscription } from 'rxjs'
import { Store, StoreDefinition, StoreSnapshot } from './'
import { equals, getDisplayName, keys, mapValues, some } from './utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

class StoreSnapshotWrapper<StoreState extends object> implements Store<StoreState> {
  constructor(
    private snapshot: StoreSnapshot<StoreState>,
    private callbackOnGet: (key: keyof StoreState) => void,
    private callbackOnGetAll: () => void
  ) { }
  get<K extends keyof StoreState>(key: K) {
    this.callbackOnGet(key)
    return this.snapshot.get(key)
  }
  set<K extends keyof StoreState>(key: K) {
    return this.snapshot.set(key)
  }
  on<K extends keyof StoreState>(key: K) {
    return this.snapshot.on(key)
  }
  onAll() {
    return this.snapshot.onAll()
  }
  getState() {
    this.callbackOnGetAll()
    return this.snapshot.getState()
  }
}

export function connect<StoreState extends object>(store: StoreDefinition<StoreState>) {
  return function <
    Props,
    PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
  >(
    Component: React.ComponentType<PropsWithStore>
  ): React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> {

    type SubscriptionKeys = keyof StoreState | '<all>'

    type State = {
      store: StoreSnapshotWrapper<StoreState>,
      subscriptions: Map<SubscriptionKeys, Subscription>
    }

    return class extends React.Component<Diff<PropsWithStore, { store: Store<StoreState> }>, State> {
      static displayName = `withStore(${getDisplayName(Component)})`

      private onGet = (field: keyof StoreState) => {
        if (this.state.subscriptions.has(field) || this.state.subscriptions.has('<all>')) {
          return
        }
        const newSubscriptions = new Map(this.state.subscriptions)
        newSubscriptions.set(
          field,
          store.on(field).subscribe(value => {
            if (equals(value, this.state.store.get(field))) {
              return
            }
            this.setState({
              store: new StoreSnapshotWrapper(store.getCurrentSnapshot(), this.onGet, this.onGetAll)
            })
          })
        )
        this.setState({ subscriptions: newSubscriptions })
      }

      private onGetAll = () => {
        if (this.state.subscriptions.has('<all>')) {
          return
        }
        const newSubscriptions = new Map()
        newSubscriptions.set(
          '<all>',
          store.onAll().subscribe(({ previousValue, value }) => {
            if (equals(previousValue, value)) {
              return
            }
            this.setState({
              store: new StoreSnapshotWrapper(store.getCurrentSnapshot(), this.onGet, this.onGetAll)
            })
          })
        )
        this.state.subscriptions.forEach(_ => _.unsubscribe())
        this.setState({ subscriptions: newSubscriptions })
      }

      state = {
        store: new StoreSnapshotWrapper(store.getCurrentSnapshot(), this.onGet, this.onGetAll),
        subscriptions: new Map()
      }
      componentWillUnmount() {
        this.state.subscriptions.forEach(_ => _.unsubscribe())
      }
      shouldComponentUpdate(props: Readonly<Diff<PropsWithStore, { store: Store<StoreState> }>>, state: State) {
        return state.store !== this.state.store
          || Object.keys(props).some(_ => (props as any)[_] !== (this.props as any)[_])
      }
      render() {
        return <Component {...this.props} store={this.state.store} />
      }
    }
  }
}

export function connectAs<
  Stores extends {[alias: string]: StoreDefinition<any>}
>(
  stores: Stores
) {
  return function<Props extends object>(
    Component: React.ComponentType<{
      [K in keyof Stores]: ReturnType<Stores[K]['toStore']>
    } & Props>
  ): React.ComponentClass<Diff<Props, Stores>> {

    type State = {
      stores: {
        [K in keyof Stores]: ReturnType<Stores[K]['getCurrentSnapshot']>
      }
      subscriptions: Subscription[]
    }

    return class extends React.Component<Diff<Props, Stores>, State> {
      static displayName = `withStore(${getDisplayName(Component)})`
      state = {
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
}
