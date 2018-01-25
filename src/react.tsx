import * as React from 'react'
import { ComponentClass } from 'react'
import { IDisposable } from 'rx'
import { Store } from './'

type Diff<T extends string, U extends string> = ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T]
type Omit<T, K extends keyof T> = { [P in Diff<keyof T, K>]: T[P] }
type Overwrite<T, U> = {[P in Diff<keyof T, keyof U>]: T[P]} & U

type StoreProxy<Actions extends object> = Pick<Store<Actions>, 'get' | 'set'>

export function connect<Actions extends object>(store: Store<Actions>) {

  let instance: React.Component<any>
  let listeners: { [k: string]: IDisposable[] } = {}
  let proxy: StoreProxy<Actions> = {
    get<K extends keyof Actions>(key: K): Actions[K] {
      if (!(key in listeners)) {
        let ignore = false
        listeners[key] = [
          store.before(key).subscribe(({ previousValue, value }) => {
            if (equals(previousValue, value)) {
              return ignore = true
            }
          }),
          store.on(key).subscribe(() => {
            if (ignore) {
              return ignore = false
            }
            instance.forceUpdate()
          })
        ]
      }
      return store.get(key)
    },
    set<K extends keyof Actions>(key: K): Actions[K] {
      return store.set(key)
    }
  }

  return function <
    Props,
    PropsWithStore extends { store: StoreProxy<Actions> } & Props = { store: StoreProxy<Actions> } & Props
  >(
    Component: React.ComponentType<PropsWithStore>
  ): React.ComponentClass<Omit<PropsWithStore, 'store'>> {

    let Class: ComponentClass<Omit<PropsWithStore, 'store'>> = class extends React.Component<Omit<PropsWithStore, 'store'>> {
      componentDidMount() {
        instance = this
      }
      componentWillUnmount() {
        for (let ls in listeners) {
          listeners[ls].forEach(_ => _.dispose())
        }
      }
      render() {
        return <Component {...this.props} store={proxy} />
      }
    }

    Class.displayName = `withStore(${getDisplayName(Component)})`

    return Class
  }
}

function getDisplayName<T>(Component: React.ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}

/**
 * TODO: Avoid diffing by passing individual values into a React component
 * rather than the whole `store`, and letting React and `shouldComponentUpdate`
 * handle diffing for us.
 */
function equals<T>(a: T, b: T): boolean {
  return a === b
}
