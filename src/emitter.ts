import { Observable as ObservableType } from 'rxjs'
import { Observable, Observer } from 'rxjs-observable'

export type ALL = '__ALL__'
const ALL: ALL = '__ALL__'

interface State<Messages extends object> {
  callChain: Set<keyof Messages | ALL>
  observables: Map<keyof Messages | ALL, Observable<any>[]>
  observers: Map<keyof Messages | ALL, Observer<any>[]>
}

const CYCLE_ERROR_MESSAGE = '[undux] Error: Cyclical dependency detected. '
  + 'This may cause a stack overflow unless you fix it. \n'
  + 'The culprit is the following sequence of .set calls, '
  + 'called from one or more of your Undux Effects: '

export class Emitter<Messages extends object> {

  private state: State<Messages> = {
    callChain: new Set,
    observables: new Map,
    observers: new Map
  }

  constructor(private isDevMode = false) {}

  /**
   * Emit an event (silently fails if no listeners are hooked up yet)
   */
  emit<K extends keyof Messages>(key: K, value: Messages[K]): this {
    if (this.isDevMode) {
      if (this.state.callChain.has(key)) {
        console.error(
          CYCLE_ERROR_MESSAGE + Array.from(this.state.callChain).concat(key).join(' -> ')
        )
        return this
      } else {
        this.state.callChain.add(key)
      }
    }
    if (this.hasChannel(key)) {
      this.emitOnChannel(key, value)
    }
    if (this.hasChannel(ALL)) {
      this.emitOnChannel(ALL, value)
    }
    if (this.isDevMode) this.state.callChain.clear()
    return this
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof Messages>(key: K): ObservableType<Messages[K]> {
    return this.createChannel(key) as any
  }

  /**
   * Subscribe to all events
   */
  all(): ObservableType<Messages[keyof Messages]> {
    return this.createChannel(ALL) as any
  }

  ///////////////////// privates /////////////////////

  private createChannel<K extends keyof Messages>(key: K | ALL) {
    if (!this.state.observers.has(key)) {
      this.state.observers.set(key, [])
    }
    if (!this.state.observables.has(key)) {
      this.state.observables.set(key, [])
    }
    const observable = new Observable<Messages[K]>(_ => {
      this.state.observers.get(key)!.push(_)
      return () => this.deleteChannel(key, observable)
    })
    this.state.observables.get(key)!.push(observable)
    return observable
  }

  private deleteChannel<K extends keyof Messages>(
    key: K | ALL,
    observable: Observable<Messages[K]>
  ) {
    if (!this.state.observables.has(key)) {
      return
    }
    const array = this.state.observables.get(key)!
    const index = array.indexOf(observable)
    if (index < 0) {
      return
    }
    array.splice(index, 1)
    if (!array.length) {
      this.state.observables.delete(key)
      this.state.observers.delete(key)
    }
  }

  private emitOnChannel<K extends keyof Messages>(
    key: K | ALL,
    value: Messages[K]
  ) {
    this.state.observers.get(key)!.forEach(_ => _.next(value))
  }

  private hasChannel<K extends keyof Messages>(key: K | ALL): boolean {
    return this.state.observables.has(key)
  }
}
