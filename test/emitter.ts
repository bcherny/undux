import test from 'ava'
import { filter, map } from 'rxjs/operators'
import { Emitter } from '../src/emitter'

type Messages = {
  SHOULD_OPEN_MODAL: { id: number, value: boolean }
  SHOULD_CLOSE_MODAL: { id: number, value: boolean }
}

test('it should trigger subscribers', t => {
  t.plan(2)
  const emitter = new Emitter<Messages>()
  emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => {
    t.is(_.id, 123)
    t.is(_.value, true)
  })
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
})

test('it should fail silently if emitting before subscribers exist', t => {
  t.plan(0)
  const emitter = new Emitter<Messages>()
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.fail('Should not get called'))
})

test('it should support Rx methods', t => {
  t.plan(1)
  const emitter = new Emitter<Messages>()
  emitter.on('SHOULD_OPEN_MODAL')
    .pipe(
      filter(_ => _.id > 100),
      map(_ => _.id * 2)
    )
    .subscribe(_ =>
      t.is(_, 202)
    )
  emitter.emit('SHOULD_OPEN_MODAL', { id: 99, value: true })
  emitter.emit('SHOULD_OPEN_MODAL', { id: 101, value: true })
})

test('it should support multiple listeners', t => {
  t.plan(2)
  const emitter = new Emitter<Messages>()
  emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.is(_.value, true))
  emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.is(_.value, true))
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
})

test('it should dispose listeners independently', t => {
  t.plan(1)
  const emitter = new Emitter<Messages>()
  const disposable1 = emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.fail())
  emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.pass())
  disposable1.unsubscribe()
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
})

test('it should automatically clean up unused listeners', t => {
  t.plan(1)
  const emitter = new Emitter<Messages>()
  const disposable1 = emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.fail())
  const disposable2 = emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.fail())
  disposable1.unsubscribe()
  disposable2.unsubscribe()
  t.is(emitter['state'].observables.has('SHOULD_OPEN_MODAL'), false)
})

test('it handle sequential additions and removals gracefully', t => {
  t.plan(5)
  const emitter = new Emitter<Messages>()
  const disposable1 = emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.fail())
  const disposable2 = emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.deepEqual(_, { id: 123, value: true }))
  disposable1.unsubscribe()
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  disposable2.unsubscribe()
  t.is(emitter['state'].observables.has('SHOULD_OPEN_MODAL'), false)
  const disposable3 = emitter.on('SHOULD_OPEN_MODAL').subscribe(_ => t.deepEqual(_, { id: 456, value: false }))
  emitter.emit('SHOULD_OPEN_MODAL', { id: 456, value: false })
  t.is(emitter['state'].observables.has('SHOULD_OPEN_MODAL'), true)
  disposable3.unsubscribe()
  t.is(emitter['state'].observables.has('SHOULD_OPEN_MODAL'), false)
})

test('#all should fire', t => {
  t.plan(4)
  const emitter = new Emitter<Messages>()
  emitter.all().subscribe(_ => t.is(_.value, true))
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
  emitter.emit('SHOULD_CLOSE_MODAL', { id: 123, value: true })
  emitter.emit('SHOULD_CLOSE_MODAL', { id: 123, value: true })
})

test('#all should fire after specific listeners', t => {
  t.plan(1)
  const emitter = new Emitter<Messages>()
  let isFirstCalled = false
  emitter.on('SHOULD_OPEN_MODAL').subscribe(() => isFirstCalled = true)
  emitter.all().subscribe(_ => t.is(isFirstCalled, true))
  emitter.emit('SHOULD_OPEN_MODAL', { id: 123, value: true })
})

// cycle detection tests

test('it should show a console error when detecting cyclical dependencies in dev mode (1)', t => {
  t.plan(1)
  console.error = (e: string) =>
    t.regex(e, /Cyclical dependency detected/)
  const emitter = new Emitter<Messages>(true)
  emitter.on('SHOULD_OPEN_MODAL').subscribe(() =>
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  )
  emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
})

test('it should show a console error when detecting cyclical dependencies in dev mode (2)', t => {
  t.plan(1)
  console.error = (e: string) =>
    t.regex(e, /Cyclical dependency detected/)
  const emitter = new Emitter<Messages>(true)
  emitter.on('SHOULD_OPEN_MODAL').subscribe(() =>
    emitter.emit('SHOULD_CLOSE_MODAL', { id: 1, value: true })
  )
  emitter.on('SHOULD_CLOSE_MODAL').subscribe(() =>
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  )
  emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
})

test('it should show a console error when detecting cyclical dependencies in dev mode (3)', t => {
  t.plan(1)
  console.error = (e: string) =>
    t.regex(e, /Cyclical dependency detected/)
  const emitter = new Emitter<Messages>(true)
  emitter.all().subscribe(() =>
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  )
  emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
})

test('it should show a console error when detecting cyclical dependencies in dev mode (4)', t => {
  t.plan(2)
  console.error = (e: string) =>
    t.regex(e, /Cyclical dependency detected/)
  const emitter = new Emitter<Messages>(true)
  emitter.all().subscribe(() =>
    emitter.emit('SHOULD_CLOSE_MODAL', { id: 1, value: true })
  )
  emitter.on('SHOULD_CLOSE_MODAL').subscribe(() =>
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  )
  emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
})

test('it not should show a console error when not detecting cyclical dependencies in dev mode', t => {
  const error = console.error
  console.error = t.fail
  const emitter = new Emitter<Messages>(true)
  emitter.on('SHOULD_CLOSE_MODAL').subscribe(() =>
    emitter.emit('SHOULD_OPEN_MODAL', { id: 1, value: true })
  )
  emitter.emit('SHOULD_CLOSE_MODAL', { id: 1, value: true })
  t.pass()
  console.error = error
})
