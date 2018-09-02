import { empty as emptyObserver } from '../Observer'
import { Subscriber } from '../Subscriber'
import { rxSubscriber as rxSubscriberSymbol } from '../symbol/rxSubscriber'
import { PartialObserver } from '../types'

export function toSubscriber<T>(
  nextOrObserver?: PartialObserver<T> | ((value: T) => void),
  error?: (error: any) => void,
  complete?: () => void
): Subscriber<T> {
  if (nextOrObserver) {
    if (nextOrObserver instanceof Subscriber) {
      return nextOrObserver as Subscriber<T>
    }

    if ((nextOrObserver as any)[rxSubscriberSymbol]) {
      return (nextOrObserver as any)[rxSubscriberSymbol]()
    }
  }

  if (!nextOrObserver && !error && !complete) {
    return new Subscriber(emptyObserver)
  }

  return new Subscriber(nextOrObserver, error, complete)
}
