import * as RxJS from 'rxjs'
import { Emitter } from 'typed-rx-emitter'
import { mapValues } from './utils'

const CYCLE_ERROR_MESSAGE = '[undux] Error: Cyclical dependency detected. '
  + 'This may cause a stack overflow unless you fix it. \n'
  + 'The culprit is the following sequence of .set calls, '
  + 'called from one or more of your Undux Effects: '

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
  onAll(): RxJS.Observable<Undux<State>[keyof State]>
  getState(): Readonly<State>
}

export class StoreSnapshot<State extends object> implements Store<State> {
  private storeDefinition: StoreDefinition<State> | null
  constructor(
    private state: State,
    storeDefinition: StoreDefinition<State>
  ) {
    this.storeDefinition = storeDefinition
  }
  get<K extends keyof State>(key: K) {
    return this.state[key]
  }
  set<K extends keyof State>(key: K) {
    if (!this.storeDefinition) {
      throw 'cant even'
    }
    return this.storeDefinition.set(key)
  }
  on<K extends keyof State>(key: K) {
    if (!this.storeDefinition) {
      throw 'cant even'
    }
    return this.storeDefinition.on(key)
  }
  onAll() {
    if (!this.storeDefinition) {
      throw 'cant even'
    }
    return this.storeDefinition.onAll()
  }
  getState() {
    return Object.freeze(this.state)
  }
  gc() {
    this.storeDefinition = null
  }
}

export type Options = {
  isDevMode: boolean
}

let DEFAULT_OPTIONS: Readonly<Options> = {
  isDevMode: false
}

export class StoreDefinition<State extends object> implements Store<State> {
  private storeSnapshot: StoreSnapshot<State> | null
  private alls: Emitter<Undux<State>>
  private emitter: Emitter<State>
  private setters: {
    readonly [K in keyof State]: (value: State[K]) => void
  }
  constructor(state: State, options: Options) {

    let emitterOptions = {
      isDevMode: options.isDevMode,
      onCycle(chain: (string | number | symbol)[]) {
        console.error(CYCLE_ERROR_MESSAGE + chain.join(' -> '))
      }
    }

    // Initialize emitters
    this.alls = new Emitter(emitterOptions)
    this.emitter = new Emitter(emitterOptions)

    // Set initial state
    this.storeSnapshot = new StoreSnapshot(state, this)

    // Cache setters
    this.setters = mapValues(state, (v, key) =>
      (value: typeof v) => {
        if (!this.storeSnapshot) {
          throw 'cant even'
        }
        let previousValue = this.storeSnapshot.get(key)
        this.storeSnapshot = new StoreSnapshot(
          Object.assign({}, this.storeSnapshot.getState(), { [key]: value }),
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
  onAll(): RxJS.Observable<Undux<State>[keyof State]> {
    return this.alls.all()
  }
  get<K extends keyof State>(key: K) {
    if (this.storeSnapshot) {
      return this.storeSnapshot.get(key)
    }
    throw 'cant even'
  }
  set<K extends keyof State>(key: K) {
    return this.setters[key]
  }
  getCurrentSnapshot() {
    return this.storeSnapshot
  }
  toStore(): Store<State> | null {
    return this.storeSnapshot
  }
  getState() {
    if (this.storeSnapshot) {
      return this.storeSnapshot.getState()
    }
    throw 'cant even'
  }
  gc() {
    if (!this.storeSnapshot) {
      throw 'cant even'
    }
    this.storeSnapshot.gc()   // break ref from snapshot -> definition
    this.storeSnapshot = null // break ref from definition -> snapshot
  }
}

export function createStore<State extends object>(
  initialState: State,
  options: Options = DEFAULT_OPTIONS
): StoreDefinition<State> {
  return new StoreDefinition<State>(initialState, options)
}

export type Plugin<State extends object> =
  (store: StoreDefinition<State>) => StoreDefinition<State>

export * from './plugins/withLogger'
export * from './plugins/withReduxDevtools'
export * from './react'
