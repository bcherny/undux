import * as React from 'react'
import { ComponentClass } from 'react'
import { Subscription } from 'rxjs'
import { Store, StoreDefinition, StoreSnapshot } from './'
import { equals, getDisplayName, keys, mapValues, some } from './utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

export function connect<StoreState extends object>(store: StoreDefinition<StoreState>) {
  return function <
    Props,
    PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
  >(
    Component: React.ComponentType<PropsWithStore>
  ): React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> {

    type State = {
      store: StoreSnapshot<StoreState>
      subscription: Subscription
    }

    return class extends React.Component<Diff<PropsWithStore, { store: Store<StoreState> }>, State> {
      static displayName = `withStore(${getDisplayName(Component)})`
      state = {
        store: store.getCurrentSnapshot(),
        subscription: store.onAll().subscribe(({ previousValue, value }) => {
          if (equals(previousValue, value)) {
            return false
          }
          this.setState({ store: store.getCurrentSnapshot() })
        })
      }
      componentWillUnmount() {
        this.state.subscription.unsubscribe()
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
