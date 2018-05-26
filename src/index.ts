import * as RxJS from 'rxjs'
import { Emitter } from 'typed-rx-emitter'
import { withReduxDevtools } from './plugins/reduxDevtools'

export type Undux<Actions extends object> = {
  [K in keyof Actions]: {
    key: K
    previousValue: Actions[K]
    value: Actions[K]
  }
}

export interface Store<Actions extends object> {
  get<K extends keyof Actions>(key: K): Actions[K]
  set<K extends keyof Actions>(key: K): (value: Actions[K]) => void
  on<K extends keyof Actions>(key: K): RxJS.Observable<Actions[K]>
  onAll<K extends keyof Actions>(): RxJS.Observable<Undux<Actions>[keyof Actions]>
  getState(): Readonly<Actions>
}

export class StoreSnapshot<Actions extends object> implements Store<Actions> {
  constructor(
    private state: Actions,
    private store: StoreDefinition<Actions>
  ) { }
  get<K extends keyof Actions>(key: K) {
    return this.state[key]
  }
  set<K extends keyof Actions>(key: K) {
    return this.store.set(key)
  }
  on<K extends keyof Actions>(key: K) {
    return this.store.on(key)
  }
  onAll<K extends keyof Actions>() {
    return this.store.onAll()
  }
  getState() {
    return Object.freeze(Object.assign({}, this.state))
  }

  private assign<Actions extends object, K extends keyof Actions>(
    key: K, value: Actions[K]) {
    return new StoreSnapshot(Object.assign({}, this.state, { [key]: value }), this.store)
  }
}

export class StoreDefinition<Actions extends object> implements Store<Actions> {
  private store: StoreSnapshot<Actions>
  private alls: Emitter<Undux<Actions>> = new Emitter
  private emitter: Emitter<Actions> = new Emitter
  constructor(state: Actions) {
    this.store = new StoreSnapshot(state, this)
  }
  on<K extends keyof Actions>(key: K): RxJS.Observable<Actions[K]> {
    return this.emitter.on(key)
  }
  onAll<K extends keyof Actions>(): RxJS.Observable<Undux<Actions>[keyof Actions]> {
    return this.alls.all()
  }
  get<K extends keyof Actions>(key: K) {
    return this.store.get(key)
  }
  set<K extends keyof Actions>(key: K) {
    return (value: Actions[K]) => {
      let previousValue = this.store.get(key)
      this.store = this.store['assign'](key, value)
      this.emitter.emit(key, value)
      this.alls.emit(key, { key, previousValue, value })
    }
  }
  getState() {
    return this.store.getState()
  }
}

export function createStore<Actions extends object>(
  initialState: Actions
): StoreDefinition<Actions> {
  return new StoreDefinition<Actions>(initialState)
}

export type Plugin<Actions extends object> =
  (store: StoreDefinition<Actions>) => StoreDefinition<Actions>

export * from './plugins/logger'
export * from './plugins/reduxDevtools'
export * from './react'
