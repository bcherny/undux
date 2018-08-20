import * as React from 'react'
import { Subscription } from 'rxjs'
import { Store, StoreDefinition, StoreSnapshotXComponent } from '../'
import { Diff, equals, getDisplayName, keys, mapValues } from '../utils'

const ALL = '__ALL__'

/**
 * @deprecated Use `createConnectedStore` instead.
 */
export function connect<StoreState extends object>(store: StoreDefinition<StoreState>) {
  return function <
    Props,
    PropsWithStore extends { store: Store<StoreState> } & Props = { store: Store<StoreState> } & Props
    >(
      Component: React.ComponentType<PropsWithStore>
    ): React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> {

    type SubscriptionKeys = keyof StoreState | typeof ALL

    type State = {
      store: StoreSnapshotXComponent<StoreState>
      subscriptions: Partial<Record<SubscriptionKeys, Subscription>>
    }

    return class extends React.Component<Diff<PropsWithStore, { store: Store<StoreState> }>, State> {
      static displayName = `withStore(${getDisplayName(Component)})`
      componentWillUnmount() {
        this.unsubscribeAll()
      }
      shouldComponentUpdate(
        props: Readonly<Diff<PropsWithStore, { store: Store<StoreState> }>>,
        state: State
      ) {
        return state.store !== this.state.store
          || keys(props).some(_ => props[_] !== this.props[_])
      }
      render() {
        return <Component {...this.props} store={this.state.store} />
      }
      private unsubscribeAll() {
        mapValues(this.state.subscriptions, _ =>
          _!.unsubscribe()
        )
        this.state.subscriptions = {}
      }
      private onGet = (field: keyof StoreState) => {
        if (field in this.state.subscriptions || ALL in this.state.subscriptions) {
          return
        }
        this.setState({
          subscriptions: Object.assign(
            {},
            this.state.subscriptions,
            {
              [field]: store
                .on(field)
                .subscribe(value => {
                  if (equals(value, this.state.store.get(field))) {
                    return
                  }
                  this.setState({
                    store: new StoreSnapshotXComponent(
                      store.getCurrentSnapshot(),
                      this.onGet,
                      this.onGetAll
                    )
                  })
                })
            }
          )
        })
      }
      private onGetAll = () => {
        if (ALL in this.state.subscriptions) {
          return
        }
        this.unsubscribeAll()
        this.setState({
          subscriptions: Object.assign(
            {},
            this.state.subscriptions,
            {
              [ALL]: store.onAll().subscribe(({ previousValue, value }) => {
                if (equals(previousValue, value)) {
                  return
                }
                this.setState({
                  store: new StoreSnapshotXComponent(
                    store.getCurrentSnapshot(),
                    this.onGet,
                    this.onGetAll
                  )
                })
              })
            }
          )
        })
      }
      state: State = {
        store: new StoreSnapshotXComponent(
          store.getCurrentSnapshot(),
          this.onGet,
          this.onGetAll
        ),
        subscriptions: {}
      }
    }
  }
}
