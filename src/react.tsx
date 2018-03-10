import * as React from 'react'
import { ComponentClass } from 'react'
import { IDisposable } from 'rx'
import { Store } from './'
import { equals, getDisplayName } from './utils'

export type Diff<T extends string, U extends string> = ({ [P in T]: P } &
  { [P in U]: never } & { [x: string]: never })[T]
export type Omit<T, K extends keyof T> = { [P in Diff<keyof T, K>]: T[P] }

export function connect<Actions extends object>(store: Store<Actions>) {
  return (...listenOn: (keyof Actions)[]) => {
    return function<
      Props,
      PropsWithStore extends { store: Store<Actions> } & Props = {
        store: Store<Actions>
      } & Props
    >(
      Component: React.ComponentType<PropsWithStore>
    ): React.ComponentClass<Omit<PropsWithStore, 'store'>> {
      let instances: React.Component<Omit<PropsWithStore, 'store'>>[] = []
      let disposers: IDisposable[] | null

      function subscribe() {
        if (!disposers) {
          disposers = listenOn.map(key => {
            return store.on(key).subscribe(() => {
              instances.forEach(_ => _.forceUpdate())
            })
          })
        }
      }

      function unsubscribe() {
        if (instances.length) {
          return
        }
        if (disposers) {
          disposers.forEach(_ => _.dispose())
          disposers = null
        }
      }

      let Class: ComponentClass<
        Omit<PropsWithStore, 'store'>
      > = class extends React.Component<Omit<PropsWithStore, 'store'>> {
        componentDidMount() {
          if (instances.indexOf(this) === -1) {
            instances.push(this)
          }
          subscribe()
        }
        componentWillUnmount() {
          instances = instances.filter(_ => _ !== this)
          unsubscribe()
        }
        render() {
          return <Component {...this.props} store={store} />
        }
      }

      Class.displayName = `withStore(${getDisplayName(Component)})`

      return Class
    }
  }
}
