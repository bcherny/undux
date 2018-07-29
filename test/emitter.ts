import test from 'ava'
import { map } from 'rxjs/operators'
import { Emitter } from '../src/emitter'

type Messages = {
  a: number
  b: string
}

test('[emitter] it should fire listeners', t => {
  t.plan(1)
  let e = new Emitter<Messages>()
  e.on('a').subscribe(a => t.is(a, 1))
  e.emit('a', 1)
})

test('[emitter] events should not buffer', t => {
  let e = new Emitter<Messages>()
  e.emit('a', 1)
  e.on('a').subscribe(() => t.fail())
})

test('[emitter] should fire .all listeners', t => {
  t.plan(1)
  let e = new Emitter<Messages>()
  e.all().subscribe(_ => t.is(_, 1))
  e.emit('a', 1)
})

// https://github.com/ReactiveX/rxjs/blob/master/src/internal/operators/map.ts
test('[emitter] it should interop with rxjs operators', t => {
  let e = new Emitter<Messages>()
  e .on('a')
    .pipe(map(a => a + 1))
    .subscribe(a => t.is(a, 1))
  e.emit('a', 1)
})
