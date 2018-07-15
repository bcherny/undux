import * as React from 'react'
import { ComponentClass } from 'react'
import { findDOMNode } from 'react-dom'
import { Subscription } from 'rxjs'
import { ALL } from 'typed-rx-emitter'
import { createStore, Store, StoreDefinition, StoreSnapshot, StoreSnapshotWithSubscription } from '../'
import { equals, getDisplayName, keys, mapValues, some } from '../utils'

export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>

const ALL: ALL = '__ALL__'

export type Effects<States extends { [alias: string]: object }> =
  (store: { [K in keyof States]: Store<States[K]> }) => void

export function connectToTreeAs<
  States extends {[alias: string]: object}
>(
  initialStates: States
) {
  let Context = React.createContext({ __MISSING_PROVIDER__: true } as any)
  let mountPoints: Element[] = []

  type ContainerProps = {
    effects?: Effects<States>[]
    initialStates?: Partial<States>
  }

  type ContainerState = {
    storeDefinitions: { [K in keyof States]: StoreDefinition<States[K]> }
    storeSnapshots: { [K in keyof States]: StoreSnapshot<States[K]> }
    subscriptions: { [K in keyof States]: Subscription }
  }

  let Container = class extends React.Component<ContainerProps, ContainerState> {
    constructor(props: ContainerProps) {
      super(props)

      let effects = props.effects || []
      let states = Object.assign({}, initialStates, props.initialStates)

      let stores = mapValues(states, _ => createStore(_))
      effects.forEach(e => e(stores))

      this.state = {
        storeDefinitions: stores,
        storeSnapshots: mapValues(stores, _ => _.getCurrentSnapshot()),
        subscriptions: mapValues(stores, (_, k) => _.onAll().subscribe(() =>
          this.setState({
            storeSnapshots: Object.assign({}, this.state.storeSnapshots, {
              [k]: _.getCurrentSnapshot()
            })
          })
        ))
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
      mapValues(this.state.subscriptions, _ => _.unsubscribe())
      let mountPoint = getDOMNode(this)
      if (mountPoint) {
        mountPoints.splice(mountPoints.indexOf(mountPoint), 1)
      }
    }
    render() {
      return <Context.Provider value={this.state.storeSnapshots}>
        {this.props.children}
      </Context.Provider>
    }
  }

  let Consumer = (props: {
    children: (stores: { [K in keyof States]: StoreSnapshot<States[K]> }) => JSX.Element
  }) =>
    <Context.Consumer>
      {stores => {
        if (!isInitialized(stores)) {
          throw Error('Component is not nested in a <Container>!')
        }
        return props.children(stores)
      }}
    </Context.Consumer>

  function withStores<
    Props extends {[K in keyof States]: StoreSnapshot<States[K]>},
    PropsWithoutStore extends Diff<Props, {[K in keyof States]: StoreSnapshot<States[K]>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let f = (props: PropsWithoutStore) => <Consumer>
      {stores => <Component {...stores} {...props} />}
    </Consumer>
    (f as any).displayName = 'withStores(' + getDisplayName(Component) + ')'
    return f
  }

  return {
    Consumer,
    Container,
    withStores
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

function isInitialized(
  store: { [alias: string]: StoreSnapshot<any> } | {__MISSING_PROVIDER__: true}
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
