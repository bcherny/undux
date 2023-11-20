import { filter, map } from 'rxjs/operators'
import { Emitter } from '../src/emitter'
import { describe, expect, test } from '@jest/globals'

type Messages = {
  SHOULD_OPEN_MODAL: { id: number; value: boolean }
  SHOULD_CLOSE_MODAL: { id: number; value: boolean }
}

describe('emitter', () => {
  test('it should trigger subscribers', () => {
    const emitter = new Emitter<Messages>()
    emitter.on('SHOULD_OPEN_MODAL').subscribe((_) => {
      expect(_.id).toBe(123)
      expect(_.value).toBe(true)
    })
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  })

  test('it should fail silently if emitting before subscribers exist', () => {
    const emitter = new Emitter<Messages>()
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
    emitter.on('SHOULD_OPEN_MODAL').subscribe((_) => expect(true).toBeFalsy())
  })

  test('it should support Rx methods', () => {
    const emitter = new Emitter<Messages>()
    emitter
      .on('SHOULD_OPEN_MODAL')
      .pipe(
        filter((_) => _.id > 100),
        map((_) => _.id * 2),
      )
      .subscribe((_) => expect(_).toBe(202))
    emitter.emit('SHOULD_OPEN_MODAL', { id: 99, value: true })
    emitter.emit('SHOULD_OPEN_MODAL', { id: 101, value: true })
  })

  test('it should support multiple listeners', () => {
    const emitter = new Emitter<Messages>()
    emitter.on('SHOULD_OPEN_MODAL').subscribe((_) => expect(_.value).toBe(true))
    emitter.on('SHOULD_OPEN_MODAL').subscribe((_) => expect(_.value).toBe(true))
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  })

  test('it should dispose listeners independently', () => {
    const emitter = new Emitter<Messages>()
    const disposable1 = emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe((_) => expect(true).toBeFalsy())
    emitter.on('SHOULD_OPEN_MODAL').subscribe((_) => expect(true).toBeTruthy())
    disposable1.unsubscribe()
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  })

  test('it should automatically clean up unused listeners', () => {
    const emitter = new Emitter<Messages>()
    const disposable1 = emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe((_) => expect(true).toBeFalsy())
    const disposable2 = emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe((_) => expect(true).toBeFalsy())
    disposable1.unsubscribe()
    disposable2.unsubscribe()
    expect(emitter['state'].observables.has('SHOULD_OPEN_MODAL')).toBe(false)
  })

  test('it handle sequential additions and removals gracefully', () => {
    const emitter = new Emitter<Messages>()
    const disposable1 = emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe((_) => expect(true).toBeFalsy())
    const disposable2 = emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe((_) => expect(_).toEqual({ id: 123, value: true }))
    disposable1.unsubscribe()
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
    disposable2.unsubscribe()
    expect(emitter['state'].observables.has('SHOULD_OPEN_MODAL')).toBe(false)
    const disposable3 = emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe((_) => expect(_).toEqual({ id: 456, value: false }))
    emitter.emit('SHOULD_OPEN_MODAL', { id: 456, value: false })
    expect(emitter['state'].observables.has('SHOULD_OPEN_MODAL')).toBe(true)
    disposable3.unsubscribe()
    expect(emitter['state'].observables.has('SHOULD_OPEN_MODAL')).toBe(false)
  })

  test('#all should fire', () => {
    const emitter = new Emitter<Messages>()
    emitter.all().subscribe((_) => expect(_.value).toBe(true))
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
    emitter.emit('SHOULD_CLOSE_MODAL', { id: 123, value: true })
    emitter.emit('SHOULD_CLOSE_MODAL', { id: 123, value: true })
  })

  test('#all should fire after specific listeners', () => {
    const emitter = new Emitter<Messages>()
    let isFirstCalled = false
    emitter.on('SHOULD_OPEN_MODAL').subscribe(() => {
      isFirstCalled = true
    })
    emitter.all().subscribe((_) => expect(isFirstCalled).toBe(true))
    emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  })

  // cycle detection tests

  test('it should show a console error when detecting cyclical dependencies in dev mode (1)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    const emitter = new Emitter<Messages>(true)
    emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe(() =>
        emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true }),
      )
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  })

  test('it should show a console error when detecting cyclical dependencies in dev mode (2)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    const emitter = new Emitter<Messages>(true)
    emitter
      .on('SHOULD_OPEN_MODAL')
      .subscribe(() =>
        emitter.emit('SHOULD_CLOSE_MODAL', { id: 1, value: true }),
      )
    emitter
      .on('SHOULD_CLOSE_MODAL')
      .subscribe(() =>
        emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true }),
      )
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  })

  test('it should show a console error when detecting cyclical dependencies in dev mode (3)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    const emitter = new Emitter<Messages>(true)
    emitter
      .all()
      .subscribe(() =>
        emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true }),
      )
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  })

  test('it should show a console error when detecting cyclical dependencies in dev mode (4)', () => {
    console.error = (e: string) =>
      expect(e).toMatch(/Cyclical dependency detected/)
    const emitter = new Emitter<Messages>(true)
    emitter
      .all()
      .subscribe(() =>
        emitter.emit('SHOULD_CLOSE_MODAL', { id: 1, value: true }),
      )
    emitter
      .on('SHOULD_CLOSE_MODAL')
      .subscribe(() =>
        emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true }),
      )
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  })

  test('it not should show a console error when not detecting cyclical dependencies in dev mode', () => {
    const error = console.error
    console.error = () => expect(true).toBeFalsy()
    const emitter = new Emitter<Messages>(true)
    emitter
      .on('SHOULD_CLOSE_MODAL')
      .subscribe(() =>
        emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true }),
      )
    emitter.emit('SHOULD_CLOSE_MODAL', { id: 1, value: true })
    expect(true).toBeTruthy()
    console.error = error
  })
})
