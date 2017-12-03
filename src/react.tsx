import * as React from 'react'
import { IDisposable } from 'rx'
import { Store } from './'

type Diff<T extends string, U extends string> = ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T]
type Omit<T, K extends keyof T> = { [P in Diff<keyof T, K>]: T[P] }
type Overwrite<T, U> = { [P in Diff<keyof T, keyof U>]: T[P] } & U

export function connect<Actions extends object>(store: Store<Actions>) {
  return (...listenOn: (keyof Actions)[]) => {
    return function <Props extends { store: Store<Actions> }>(
      Component: React.ComponentType<Props>
    ) {

      let state: IDisposable[]

      return class extends React.Component<Omit<Props, 'store'>> {
        componentDidMount() {
          state = listenOn.map(key =>
            store.on(key).subscribe(() => this.forceUpdate())
          )
        }
        componentWillUnmount() {
          state.forEach(_ => _.dispose())
        }
        render() {
          return <Component {...this.props} store={store} />
        }
      }
    }
  }
}
