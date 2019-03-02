import { connectAs, Store, StoreDefinition } from '../'
import { Diff } from '../utils'

/**
 * @deprecated Use `createConnectedStore` instead.
 */
export function connect<StoreState extends object>(
  store: StoreDefinition<StoreState>
): <
  Props,
  PropsWithStore extends { store: Store<StoreState> } & Props = {
    store: Store<StoreState>
  } & Props
>(
  Component: React.ComponentType<PropsWithStore>
) => React.ComponentClass<Diff<PropsWithStore, { store: Store<StoreState> }>> {
  return connectAs({ store } as any) as any
}
