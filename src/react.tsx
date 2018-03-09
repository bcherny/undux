import * as React from 'react'
import { IDisposable } from 'rx'
import { Store } from './'
import { getDisplayName } from './utils'

export type Diff<T extends string, U extends string> = ({ [P in T]: P } &
  { [P in U]: never } & { [x: string]: never })[T]
export type Omit<T, K extends keyof T> = { [P in Diff<keyof T, K>]: T[P] }

type WithStoreComponentClass<P, WP> = React.ComponentClass<P> & {
  WrappedComponent: React.ComponentType<WP>
}

export function connect<Actions extends object>(store: Store<Actions>) {
  return (...listenOn: (keyof Actions)[]) => {
    return function<
      Props,
      PropsWithStore extends { store: Store<Actions> } & Props = {
        store: Store<Actions>
      } & Props
    >(
      Component: React.ComponentType<PropsWithStore>
    ): WithStoreComponentClass<Omit<PropsWithStore, 'store'>, PropsWithStore> {
      class Class extends React.Component<Omit<PropsWithStore, 'store'>> {
        disposers: IDisposable[] = []
        componentDidMount() {
          this.disposers = listenOn.map(key => {
            return store.on(key).subscribe(() => {
              this.forceUpdate()
            })
          })
        }
        componentWillUnmount() {
          this.disposers.forEach(_ => _.dispose())
        }
        render() {
          return <Component {...this.props} store={store} />
        }
      }

      return Object.assign(Class, {
        displayName: `withStore(${getDisplayName(Component)})`,
        WrappedComponent: Component
      })
    }
  }
}
