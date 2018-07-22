import * as React from 'react'
import { ComponentClass } from 'react'
import { findDOMNode } from 'react-dom'
import { Subscription } from 'rxjs'
import { ALL } from 'typed-rx-emitter'
import { createStore, Store, StoreDefinition, StoreSnapshot } from '../'
import { equals, getDisplayName, keys, mapValues, some } from '../utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

const ALL: ALL = '__ALL__'

export type Effect<State extends object> = (store: Store<State>) => void

export function connectToTree<State extends object>(
  initialState: State
) {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)
  let mountPoints: Element[] = []

  type ContainerProps = {
    effects?: Effect<State>[]
    initialState?: State
  }

  type ContainerState = {
    storeDefinition: StoreDefinition<State>
    storeSnapshot: StoreSnapshot<State>
    subscription: Subscription
  }

  let Container = class extends React.Component<ContainerProps, ContainerState> {
    constructor(props: ContainerProps) {
      super(props)

      let effects = props.effects || []
      let state = props.initialState || initialState

      let store = createStore(state)
      effects.forEach(e => e(store))

      this.state = {
        storeDefinition: store,
        storeSnapshot: store.getCurrentSnapshot(),
        subscription: store.onAll().subscribe(() =>
          this.setState({ storeSnapshot: store.getCurrentSnapshot() })
        )
      }
    }
    componentDidMount() {
      let mountPoint = getDOMNode(this)
      if (!mountPoint) {
        return
      }
      if (mountPoints.some(_ => isParentNode(_, mountPoint as Element))) { // TODO
        throw Error('Avoid nesting multiple <Container>s!')
      }
      mountPoints.push(mountPoint)
    }
    componentWillUnmount() {
      this.state.subscription.unsubscribe()
      let mountPoint = getDOMNode(this)
      if (mountPoint) {
        mountPoints.splice(mountPoints.indexOf(mountPoint), 1)
      }
    }
    render() {
      return <Context.Provider value={this.state.storeSnapshot}>
        {this.props.children}
      </Context.Provider>
    }
  }

  let Consumer = (props: {
    children: (store: StoreSnapshot<State>) => JSX.Element
  }) =>
    <Context.Consumer>
      {store => {
        if (!isInitialized(store)) {
          throw Error('Component is not nested in a <Container>!')
        }
        return props.children(store)
      }}
    </Context.Consumer>

  function withStore<
    Props extends {store: StoreSnapshot<State>},
    PropsWithoutStore extends Diff<Props, {store: StoreSnapshot<State>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let f = (props: PropsWithoutStore) => <Consumer>
      {store => <Component store={store} {...props} />}
    </Consumer>
    (f as any).displayName = 'withStore(' + getDisplayName(Component) + ')'
    return f
  }

  return {
    Consumer,
    Container,
    withStore
  }
}

function getDOMNode(component: React.ReactInstance) {
  let node = findDOMNode(component)
  if (!isElement(node)) {
    return null
  }
  return node
}

function isElement(node: Element | Text | null): node is Element {
  return node !== null && node.nodeType === 1
}

function isInitialized<State extends object>(
  store: StoreSnapshot<State> | {__MISSING_PROVIDER__: true}
) {
  return !('__MISSING_PROVIDER__' in store)
}

function isParentNode(maybeParent: Element, maybeChild: Element): boolean {
  if (maybeParent === maybeChild) {
    return false
  }
  if (!maybeChild.parentElement) {
    return false
  }
  if (maybeChild.parentElement === maybeParent) {
    return true
  }
  return isParentNode(maybeParent, maybeChild.parentElement)
}
