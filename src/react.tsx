import * as React from 'react'
import { ComponentClass } from 'react'
import { Subscription } from 'rxjs'
import { ALL } from 'typed-rx-emitter'
import { Store, StoreDefinition, StoreSnapshot, StoreSnapshotWithSubscription } from './'
import { equals, getDisplayName, keys, mapValues, some } from './utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

const ALL: ALL = '__ALL__'

export function connect<StoreState extends object>(store: StoreDefinition<StoreState>) {
  return function <
    Props,
    PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
  >(
    Component: React.ComponentType<PropsWithStore>
  ): React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> {

    type Key = keyof StoreState | ALL

    type State = {
      store: StoreSnapshotWithSubscription<StoreState>
      subscriptions: Partial<Record<Key, Subscription>>
    }

    return class extends React.Component<Diff<PropsWithStore, { store: Store<StoreState> }>, State> {
      static displayName = `withStore(${getDisplayName(Component)})`
      state: State = {
        store: new StoreSnapshotWithSubscription(
          store.getCurrentSnapshot(),
          this.onGet.bind(this),
          this.onGetAll.bind(this)
        ),
        subscriptions: {}
      }
      onChange<K extends keyof StoreState>(key: K, value: StoreState[K]) {
        if (equals(value, this.state.store.get(key))) {
          return
        }
        this.setState({
          store: new StoreSnapshotWithSubscription(
            store.getCurrentSnapshot(), // TODO: Can we replace Snapshot with SnapshotWithSub?
            this.onGet.bind(this),
            this.onGetAll.bind(this)
          )
        })
      }
      onGet(key: keyof StoreState) {
        if (key in this.state.subscriptions || ALL in this.state.subscriptions) {
          return
        }
        // Hacky direct write to state, for performance
        this.state.subscriptions[key] = store.on(key).subscribe(this.onChange.bind(this, key))
      }
      onGetAll() {
        if (ALL in this.state.subscriptions) {
          return
        }

        // Clear per-key subscriptions
        // TODO: Find a way to test this. React batches render() calls,
        // so it's hard to test that this actually prevents extra re-renders.
        this.clearSubscriptions()

        // Hacky direct write to state, for performance
        this.state.subscriptions = {
          [ALL]: store.onAll().subscribe(({ key, value }) =>
            this.onChange(key, value)
          )
        } as any // TODO
      }
      clearSubscriptions() {
        mapValues(this.state.subscriptions, _ => _!.unsubscribe())
      }
      componentWillUnmount() {
        this.clearSubscriptions()
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
