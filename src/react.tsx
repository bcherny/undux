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
      let state: IDisposable[]

      let Class: ComponentClass<
        Omit<PropsWithStore, 'store'>
      > = class extends React.Component<Omit<PropsWithStore, 'store'>> {
        componentDidMount() {
          state = listenOn.map(key => {
            return store.on(key).subscribe(() => {
              this.forceUpdate()
            })
          })
        }
        componentWillUnmount() {
          state.forEach(_ => _.dispose())
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
