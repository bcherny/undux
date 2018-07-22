import * as React from 'react'
import { Store, StoreDefinition, StoreSnapshot } from '..'
import { getDisplayName, keys, mapValues } from '../utils'
import { Connect, ContainerProps, Diff, Effect } from './connectToTree'

export type CombinedContainerProps<States extends {
  [alias: string]: any
}> = {
  effects?: CombinedEffect<States>
  initialStates?: States
}

export type CombinedEffect<States extends {
  [alias: string]: any
}> = (stores: {[K in keyof States]: StoreDefinition<States[K]>}) => void

type CombinedConnect<
  States extends { [alias: string]: any }
> = {
  Container: React.ComponentType<CombinedContainerProps<States>>
  withStores: <
    Props extends {[K in keyof States]: StoreSnapshot<States[K]>},
    PropsWithoutStore = Diff<Props, {[K in keyof States]: StoreSnapshot<States[K]>}>
  >(
    Component: React.ComponentType<Props>
  ) => React.ComponentType<PropsWithoutStore>
}

export function combineAs<
  Connects extends { [alias: string]: Connect<any> },
  States extends {[K in keyof Connects]: Connects[K]['initialState']}
>(connects: Connects): CombinedConnect<States> {

  type Tuple = [
    React.ComponentType<ContainerProps<States[keyof States]>>,
    States[keyof States] | undefined,
    CombinedEffect<States>
  ]

  let Container: React.StatelessComponent<CombinedContainerProps<States>> = props => {
    let containers = keys(connects).map(k => [
      connects[k].Container,
      props.initialStates ? props.initialStates[k] : undefined,
      props.effects
    ] as Tuple)
    return recurse(containers, props.children, 0)
  }

  function withStores<
    Props extends {[K in keyof States]: Store<States[K]>},
    PropsWithoutStore extends Diff<Props, {[K in keyof States]: Store<States[K]>}>
  >(
    Component: React.ComponentType<Props>
  ): React.ComponentType<PropsWithoutStore> {
    let C = Component
    keys(connects).forEach(k => C = connects[k].withStore(props =>
      <C {...{ k: props.store } as any} />
    ))
    C.displayName = `withStores(${getDisplayName(C)})`
    return C as any
  }

  function recurse(
    cs: Tuple[],
    children: React.ReactNode | undefined,
    index: number
  ): React.ReactElement<any> {
    let [C, initialState, effects] = cs[index]
    return index >= cs.length - 1
      ? <C initialState={initialState}>{children}</C>
      : <C>{recurse(cs, children, index + 1)}</C>
  }

  return {Container, withStores} as any
}
