import * as React from 'react'
import { findDOMNode } from 'react-dom'
import { Subscription } from 'rxjs'
import { ALL } from 'typed-rx-emitter'
import { createStore, Store, StoreDefinition, StoreSnapshot } from '..'
import { getDisplayName } from '../utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

const ALL: ALL = '__ALL__'

export type Effect<State extends object> = (store: Store<State>) => void

export type Connect<State extends object> = {
  Container: React.ComponentType<ContainerProps<State>>
  withStore: <
    Props extends {store: Store<State>},
    PropsWithoutStore extends Diff<Props, {store: Store<State>}>
  >(
    Component: React.ComponentType<Props>
  ) => React.ComponentType<PropsWithoutStore>
}

export type ContainerProps<State extends object> = {
  effects?: Effect<State>[]
  initialState?: State
}

export function connectToTree<State extends object>(
  initialState: State
): Connect<State> {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)
  let mountPoints: Element[] = []

  type ContainerState = {
    storeDefinition: StoreDefinition<State> | null
    storeSnapshot: StoreSnapshot<State> | null
    subscription: Subscription
  }

  class Container extends React.Component<ContainerProps<State>, ContainerState> {
    constructor(props: ContainerProps<State>) {
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
        throw Error('Avoid nesting multiple <Container>s of the same type.')
      }
      mountPoints.push(mountPoint)
    }
    componentWillUnmount() {
      this.state.subscription.unsubscribe()
      let mountPoint = getDOMNode(this)
      if (mountPoint) {
        mountPoints.splice(mountPoints.indexOf(mountPoint), 1)
      }
      // Let the state get GC'd.
      // TODO: Find a more elegant way to do this.
      if (!mountPoints.length) {
        (this.state.storeSnapshot as any).state = null;
        (this.state.storeSnapshot as any).storeDefinition = null;
        (this.state.storeDefinition as any).storeSnapshot = null
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
    displayName: string
  }) =>
    <Context.Consumer>
      {store => {
        if (!isInitialized(store)) {
          throw Error(`Component "${props.displayName}" is not nested in a <Container>. To fix this error, be sure to render the component in a <Container>...</Container> tag.`)
        }
        return props.children(store)
      }}
    </Context.Consumer>

  function withStore<
    Props extends {store: Store<State>},
    PropsWithoutStore extends Diff<Props, {store: Store<State>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let f = (props: PropsWithoutStore) => <Consumer displayName={getDisplayName(Component)}>
      {store => <Component store={store} {...props} />}
    </Consumer>
    (f as any).displayName = 'withStore(' + getDisplayName(Component) + ')'
    return f
  }

  return {
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
