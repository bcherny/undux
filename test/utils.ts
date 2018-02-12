import { test } from 'ava'
import * as Immutable from 'immutable'
import { isImmutable } from '../src/utils'

test('isImmutable', t => {
  t.is(isImmutable(Immutable.List()), true)
  t.is(isImmutable(Immutable.Map()), true)
  t.is(isImmutable(Immutable.OrderedMap()), true)
  t.is(isImmutable(Immutable.Set()), true)
  t.is(isImmutable(Immutable.OrderedSet()), true)
  t.is(isImmutable(Immutable.Stack()), true)
  t.is(isImmutable(Immutable.Range()), true)
  t.is(isImmutable(Immutable.Repeat('a')), true)
  t.is(isImmutable(Immutable.Record({})()), true)
  t.is(isImmutable(Immutable.Seq()), true)
  t.is(isImmutable(Immutable.Seq.Keyed()), true)
  t.is(isImmutable(Immutable.Seq.Indexed()), true)
  t.is(isImmutable(Immutable.Seq.Set()), true)
  t.is(isImmutable(true), false)
  t.is(isImmutable([]), false)
  t.is(isImmutable({}), false)
  t.is(isImmutable(Object.freeze({})), false)
  t.is(isImmutable(() => {}), false)
  t.is(isImmutable(null), false)
  t.is(isImmutable(undefined), false)
  t.is(isImmutable('a'), false)
  t.is(isImmutable(42), false)
})
