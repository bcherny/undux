import * as RxJS from 'rxjs'
import { Emitter } from 'typed-rx-emitter'
import { keys, mapValues } from './utils'

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

/**
 * Public Store interface. When you want to reference the Store type,
 * this is almost always the type to use.
 */
export interface Store<State extends object> {
  get<K extends keyof State>(key: K): State[K]
  set<K extends keyof State>(key: K): (value: State[K]) => void
  on<K extends keyof State>(key: K): RxJS.Observable<State[K]>
  onAll(): RxJS.Observable<Undux<State>[keyof State]>
  getState(): Readonly<State>
}

export type Options = {
  isDevMode: boolean
}

let DEFAULT_OPTIONS: Readonly<Options> = {
  isDevMode: false
}

function createSnapshot<State extends object>(
  state: State,
  storeDefinition: StoreDefinition<State>
): State {
  return Object.defineProperties({}, mapValues(state, (v, k) => ({
    configurable: false,
    enumerable: true,
    get() {
      // TODO: Add get trigger
      return v
    },
    set(value: typeof v) {
      // TODO: Add set trigger
      storeDefinition.set(k)(value)
      return value
    }
  })))
}

export type StoreSnapshot<State extends object> = State

/**
 * We create a single instance of this per Container.
 */
export class StoreDefinition<State extends object> implements Store<State> {
  private storeSnapshot: StoreSnapshot<State>
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
    this.storeSnapshot = createSnapshot(state, this)

    // Cache setters
    this.setters = mapValues(state, (v, key) =>
      (value: typeof v) => {
        console.log('set', key, value)
        let previousValue = this.storeSnapshot[key]
        this.storeSnapshot = createSnapshot(
          Object.assign({}, this.storeSnapshot, { [key]: value }),
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
    return this.storeSnapshot[key]
  }
  set<K extends keyof State>(key: K) {
    return this.setters[key]
  }
  getCurrentSnapshot() {
    return this.storeSnapshot
  }
  getState() {
    return this.storeSnapshot
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
