import * as React from 'react'
import { ComponentClass } from 'react'
import { IDisposable } from 'rx'
import { Store } from './'

type Diff<T extends string, U extends string> = ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T]
type Omit<T, K extends keyof T> = { [P in Diff<keyof T, K>]: T[P] }
type Overwrite<T, U> = { [P in Diff<keyof T, keyof U>]: T[P] } & U

export function connect<Actions extends object>(store: Store<Actions>) {
  return <
    A extends keyof Actions
  >(...listenOn: A[]) => {
    return function <
      Props,
      PropsWithStore extends { store: Store<Actions> } & Props = { store: Store<Actions> } & Props
      >(
      Component: React.ComponentType<Props & Pick<Actions, A> & { set: Store<Actions>['set'] }>
    ): React.ComponentClass<Props> {

      type State = Pick<Actions, A>

      let state: IDisposable[]

      let Class: ComponentClass<Props> = class extends React.Component<Props, State> {
        state: State = {} as State
        componentDidMount() {
          state = listenOn.map(key => {
            let ignore = false
            return store.on(key).subscribe(value => {
              if (ignore) {
                return ignore = false
              }
              this.setState({ [key]: value } as any)
            })
          })
        }
        componentWillUnmount() {
          state.forEach(_ => _.dispose())
        }
        render() {
          return <Component {...this.state} {...this.props} set={store.set} />
        }
      }

      Class.displayName = `withStore(${getDisplayName(Component)})`

      return Class
    }
  }
}

function getDisplayName<T>(Component: React.ComponentType<T>): string {
  return Component.displayName || Component.name || 'Component'
}
