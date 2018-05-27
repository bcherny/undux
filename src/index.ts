import * as RxJS from 'rxjs'
import { Emitter } from 'typed-rx-emitter'
import { mapValues } from './utils'

export type Undux<State extends object> = {
  [K in keyof State]: {
    key: K
    previousValue: State[K]
    value: State[K]
  }
}

export interface Store<State extends object> {
  get<K extends keyof State>(key: K): State[K]
  set<K extends keyof State>(key: K): (value: State[K]) => void
  on<K extends keyof State>(key: K): RxJS.Observable<State[K]>
  onAll<K extends keyof State>(): RxJS.Observable<Undux<State>[keyof State]>
  getState(): Readonly<State>
}

export class StoreSnapshot<State extends object> implements Store<State> {
  constructor(
    private state: State,
    private store: StoreDefinition<State>
  ) { }
  get<K extends keyof State>(key: K) {
    return this.state[key]
  }
  set<K extends keyof State>(key: K) {
    return this.store.set(key)
  }
  on<K extends keyof State>(key: K) {
    return this.store.on(key)
  }
  onAll<K extends keyof State>() {
    return this.store.onAll()
  }
  getState() {
    return Object.freeze(this.state)
  }
}

export class StoreDefinition<State extends object> implements Store<State> {
  private store: StoreSnapshot<State>
  private alls: Emitter<Undux<State>> = new Emitter
  private emitter: Emitter<State> = new Emitter
  private setters: {
    readonly [K in keyof State]: (value: State[K]) => void
  }
  constructor(state: State) {

    // Set initial state
    this.store = new StoreSnapshot(state, this)

    // Cache setters
    this.setters = mapValues(state, (v, key) =>
      (value: typeof v) => {
        let previousValue = this.store.get(key)
        this.store = new StoreSnapshot(
          Object.assign({}, this.store.getState(), { [key]: value }),
          this
        )
        this.emitter.emit(key, value)
        this.alls.emit(key, { key, previousValue, value })
      }
    )
  }
  on<K extends keyof State>(key: K): RxJS.Observable<State[K]> {
    return this.emitter.on(key)
  }
  onAll<K extends keyof State>(): RxJS.Observable<Undux<State>[keyof State]> {
    return this.alls.all()
  }
  get<K extends keyof State>(key: K) {
    return this.store.get(key)
  }
  set<K extends keyof State>(key: K) {
    return this.setters[key]
  }
  getState() {
    return this.store.getState()
  }
}

export class StoreDefinitionWithActions<
  State extends object,
  Actions extends object
> extends StoreDefinition<State> {
  private actions = new Emitter<Actions>()
  act<K extends keyof Actions>(action: K) {
    return (value: Actions[K]) =>
      this.actions.emit(action, value)
  }
  react<K extends keyof Actions>(key: K): RxJS.Observable<Actions[K]> {
    return this.actions.on(key)
  }
}

export function createStore<State extends object>(
  initialState: State
): StoreDefinition<State> {
  return new StoreDefinition<State>(initialState)
}

export function createStoreWithActions<State extends object, Actions extends object>(
  initialState: State
): StoreDefinitionWithActions<State, Actions> {
  return new StoreDefinitionWithActions(initialState)
}

export type Plugin<State extends object, S extends StoreDefinition<State> = StoreDefinition<State>> =
  (store: S) => S

export * from './plugins/withLogger'
export * from './plugins/withReduxDevtools'
export * from './react'
