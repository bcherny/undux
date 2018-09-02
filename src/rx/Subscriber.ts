// import { config } from './config'
import { empty as emptyObserver } from './Observer'
import { Subscription } from './Subscription'
import { rxSubscriber as rxSubscriberSymbol } from './symbol/rxSubscriber'
import { Observer, PartialObserver, TeardownLogic } from './types'
import { hostReportError } from './util/hostReportError'
import { isFunction } from './util/isFunction'

/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 *
 * @class Subscriber<T>
 */
export class Subscriber<T> extends Subscription implements Observer<T> {
  [rxSubscriberSymbol]() {
    return this
  }

  /**
   * A static factory for a Subscriber, given a (potentially partial) definition
   * of an Observer.
   * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
   * @param {function(e: ?any): void} [error] The `error` callback of an
   * Observer.
   * @param {function(): void} [complete] The `complete` callback of an
   * Observer.
   * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
   * Observer represented by the given arguments.
   * @nocollapse
   */
  static create<T>(
    next?: (x?: T) => void,
    error?: (e?: any) => void,
    complete?: () => void
  ): Subscriber<T> {
    const subscriber = new Subscriber(next, error, complete)
    subscriber.syncErrorThrowable = false
    return subscriber
  }

  /** @internal */ syncErrorValue: any = null
  /** @internal */ syncErrorThrown: boolean = false
  /** @internal */ syncErrorThrowable: boolean = false

  protected isStopped: boolean = false
  protected destination: PartialObserver<any> // this `any` is the escape hatch to erase extra type param (e.g. R)

  private _parentSubscription: Subscription | null = null

  /**
   * @param {Observer|function(value: T): void} [destinationOrNext] A partially
   * defined Observer or a `next` callback function.
   * @param {function(e: ?any): void} [error] The `error` callback of an
   * Observer.
   * @param {function(): void} [complete] The `complete` callback of an
   * Observer.
   */
  constructor(
    destinationOrNext?: PartialObserver<any> | ((value: T) => void),
    error?: (e?: any) => void,
    complete?: () => void
  ) {
    super()

    switch (arguments.length) {
      case 0:
        this.destination = emptyObserver
        break
      case 1:
        if (!destinationOrNext) {
          this.destination = emptyObserver
          break
        }
        if (typeof destinationOrNext === 'object') {
          // HACK(benlesh): For situations where Node has multiple copies of rxjs in
          // node_modules, we cannot rely on `instanceof` checks
          if (isTrustedSubscriber(destinationOrNext)) {
            const trustedSubscriber = (destinationOrNext as any)[
              rxSubscriberSymbol
            ]() as Subscriber<any>
            this.syncErrorThrowable = trustedSubscriber.syncErrorThrowable
            this.destination = trustedSubscriber
            trustedSubscriber.add(this)
          } else {
            this.syncErrorThrowable = true
            this.destination = new SafeSubscriber<T>(
              this,
              destinationOrNext as PartialObserver<any>
            )
          }
          break
        }
      default:
        this.syncErrorThrowable = true
        this.destination = new SafeSubscriber<T>(
          this,
          destinationOrNext as ((value: T) => void),
          error,
          complete
        )
        break
    }
  }

  /**
   * The {@link Observer} callback to receive notifications of type `next` from
   * the Observable, with a value. The Observable may call this method 0 or more
   * times.
   * @param {T} [value] The `next` value.
   * @return {void}
   */
  next(value?: T): void {
    if (!this.isStopped) {
      this._next(value as any)
    }
  }

  /**
   * The {@link Observer} callback to receive notifications of type `error` from
   * the Observable, with an attached `Error`. Notifies the Observer that
   * the Observable has experienced an error condition.
   * @param {any} [err] The `error` exception.
   * @return {void}
   */
  error(err?: any): void {
    if (!this.isStopped) {
      this.isStopped = true
      this._error(err)
    }
  }

  /**
   * The {@link Observer} callback to receive a valueless notification of type
   * `complete` from the Observable. Notifies the Observer that the Observable
   * has finished sending push-based notifications.
   * @return {void}
   */
  complete(): void {
    if (!this.isStopped) {
      this.isStopped = true
      this._complete()
    }
  }

  unsubscribe(): void {
    if (this.closed) {
      return
    }
    this.isStopped = true
    super.unsubscribe()
  }

  protected _next(value: T): void {
    this.destination.next!(value)
  }

  protected _error(err: any): void {
    this.destination.error!(err)
    this.unsubscribe()
  }

  protected _complete(): void {
    this.destination.complete!()
    this.unsubscribe()
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  _addParentTeardownLogic(parentTeardownLogic: TeardownLogic) {
    if (parentTeardownLogic !== this) {
      this._parentSubscription = this.add(parentTeardownLogic)
    }
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  _unsubscribeParentSubscription() {
    if (this._parentSubscription !== null) {
      this._parentSubscription.unsubscribe()
    }
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  _unsubscribeAndRecycle(): Subscriber<T> {
    const { _parent, _parents } = this
    this._parent = null as any
    this._parents = null as any
    this.unsubscribe()
    this.closed = false
    this.isStopped = false
    this._parent = _parent
    this._parents = _parents
    return this
  }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
class SafeSubscriber<T> extends Subscriber<T> {
  private _context: any

  constructor(
    private _parentSubscriber: Subscriber<T>,
    observerOrNext?: PartialObserver<T> | ((value: T) => void),
    error?: (e?: any) => void,
    complete?: () => void
  ) {
    super()

    let next: ((value: T) => void)
    let context: any = this

    if (isFunction(observerOrNext)) {
      next = observerOrNext as ((value: T) => void)
    } else if (observerOrNext) {
      next = (observerOrNext as PartialObserver<T>).next as any
      error = (observerOrNext as PartialObserver<T>).error
      complete = (observerOrNext as PartialObserver<T>).complete
      if (observerOrNext !== emptyObserver) {
        context = Object.create(observerOrNext)
        if (isFunction(context.unsubscribe)) {
          this.add(context.unsubscribe.bind(context) as () => void)
        }
        context.unsubscribe = this.unsubscribe.bind(this)
      }
    }

    this._context = context
    // @ts-ignore
    this._next = next
    this._error = error as any
    this._complete = complete as any
  }

  next(value?: T): void {
    if (!this.isStopped && this._next) {
      this.__tryOrUnsub(this._next, value)
    }
  }

  error(err?: any): void {
    if (!this.isStopped) {
      const { _parentSubscriber } = this
      if (this._error) {
        this.__tryOrUnsub(this._error, err)
        this.unsubscribe()
      } else if (!_parentSubscriber.syncErrorThrowable) {
        this.unsubscribe()
        hostReportError(err)
      } else {
        hostReportError(err)
        this.unsubscribe()
      }
    }
  }

  complete(): void {
    if (!this.isStopped) {
      if (this._complete) {
        const wrappedComplete = () => this._complete.call(this._context)
        this.__tryOrUnsub(wrappedComplete)
      }
      this.unsubscribe()
    }
  }

  private __tryOrUnsub(fn: Function, value?: any): void {
    try {
      fn.call(this._context, value)
    } catch (err) {
      this.unsubscribe()
      hostReportError(err)
    }
  }

  private __tryOrSetError(
    parent: Subscriber<T>,
    fn: Function,
    value?: any
  ): boolean {
    throw new Error('bad call')
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  _unsubscribe(): void {
    const { _parentSubscriber } = this
    this._context = null
    this._parentSubscriber = null as any
    _parentSubscriber.unsubscribe()
  }
}

function isTrustedSubscriber(obj: any) {
  return (
    obj instanceof Subscriber ||
    ('syncErrorThrowable' in obj && obj[rxSubscriberSymbol])
  )
}
