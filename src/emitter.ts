type Options = {
  isDevMode: boolean,
  onCycle(chain: (string | number | symbol)[]): void
}

export type Subscription = {
  unsubscribe(): void
}

export interface UnaryFunction<T, R> {
  (source: T): R
}
export interface OperatorFunction<T, R> extends UnaryFunction<IObservable<T>, IObservable<R>> {
}

export interface IObservable<T> {

  pipe(): IObservable<T>
  pipe<A>(op1: OperatorFunction<T, A>): IObservable<A>
  pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): IObservable<B>
  pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): IObservable<C>
  pipe<A, B, C, D>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): IObservable<D>
  pipe<A, B, C, D, E>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): IObservable<E>
  pipe<A, B, C, D, E, F>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>): IObservable<F>
  pipe<A, B, C, D, E, F, G>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>): IObservable<G>
  pipe<A, B, C, D, E, F, G, H>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>): IObservable<H>
  pipe<A, B, C, D, E, F, G, H, I>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>): IObservable<I>
  pipe<R>(...operations: OperatorFunction<any, any>[]): IObservable<R>

  subscribe(f: Listener<T>): Subscription
}

type Listener<A> = (value: A) => any

const DEFAULT_OPTIONS: Options = {
  isDevMode: false,
  onCycle(chain) {
    console.error(
      'Error: Cyclical dependency detected. '
      + 'This may cause a stack overflow unless you fix it. '
      + chain.join(' -> ')
    )
  }
}

export class Emitter<Messages extends object> {

  private allListeners: Listener<Messages[keyof Messages]>[] = []
  private listeners: {
    [K in keyof Messages]?: Listener<Messages[K]>[]
  } = {}
  private options: Options
  private callstack = new Set

  constructor(options?: Partial<Options>) {
    this.options = {...DEFAULT_OPTIONS, ...options}
  }
  emit<K extends keyof Messages>(k: K, v: Messages[K]) {
    let { isDevMode, onCycle } = this.options
    if (isDevMode) {
      if (this.callstack.has(k)) {
        onCycle(Array.from(this.callstack).concat(k))
        return this
      } else {
        this.callstack.add(k)
      }
    }
    let listeners = this.listeners[k]
    this.allListeners.forEach(f => f(v))
    if (!listeners) {
      return
    }
    listeners.forEach(f => f(v))
    if (isDevMode) {
      this.callstack.clear()
    }
  }
  on<K extends keyof Messages>(k: K): Observable<Messages[K]> {
    if (!(k in this.listeners)) {
      this.listeners[k] = []
    }
    let listeners = this.listeners[k]!
    let index = listeners.push(f)
    return new Observable<Messages[K]>(
      () => listeners.splice(index, 1)
    )
  }
  all(): Observable<Messages[keyof Messages]> {
    return {
      subscribe: f => {
        let index = this.allListeners.push(f)
        return {
          unsubscribe: () => this.allListeners.splice(index, 1)
        }
      }
    }
  }
}

class Observable<A> implements IObservable<A> {
  constructor(
    private onUnsubscribe: () => void
  ) {}
  pipe(...fs: OperatorFunction<A, any>[]) {
    return new Observable(this.onUnsubscribe)
  }
  subscribe(f: Listener<A>): Subscription {
    return {
      unsubscribe: this.onUnsubscribe
    }
  }
}
