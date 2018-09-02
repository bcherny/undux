import { Observer } from './types'
import { hostReportError } from './util/hostReportError'

export const empty: Observer<any> = {
  closed: true,
  next(value: any): void {
    /* noop */
  },
  error(err: any): void {
    hostReportError(err)
  },
  complete(): void {
    /*noop*/
  }
}
