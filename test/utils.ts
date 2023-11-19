import * as Immutable from 'immutable'
import { isImmutable, keys, mapValues, some } from '../src/utils'
import { describe, expect, test } from '@jest/globals'

describe('utils', () => {
  test('isImmutable', () => {
    expect(isImmutable(Immutable.List())).toBe(true)
    expect(isImmutable(Immutable.Map())).toBe(true)
    expect(isImmutable(Immutable.OrderedMap())).toBe(true)
    expect(isImmutable(Immutable.Set())).toBe(true)
    expect(isImmutable(Immutable.OrderedSet())).toBe(true)
    expect(isImmutable(Immutable.Stack())).toBe(true)
    expect(isImmutable(Immutable.Range())).toBe(true)
    expect(isImmutable(Immutable.Repeat('a'))).toBe(true)
    expect(isImmutable(Immutable.Record({})())).toBe(true)
    expect(isImmutable(Immutable.Seq())).toBe(true)
    expect(isImmutable(Immutable.Seq.Keyed())).toBe(true)
    expect(isImmutable(Immutable.Seq.Indexed())).toBe(true)
    expect(isImmutable(Immutable.Seq.Set())).toBe(true)
    expect(isImmutable(true)).toBe(false)
    expect(isImmutable([])).toBe(false)
    expect(isImmutable({})).toBe(false)
    expect(isImmutable(Object.freeze({}))).toBe(false)
    expect(isImmutable(() => {})).toBe(false)
    expect(isImmutable(null)).toBe(false)
    expect(isImmutable(undefined)).toBe(false)
    expect(isImmutable('a')).toBe(false)
    expect(isImmutable(42)).toBe(false)
  })

  test('keys', () => {
    expect(keys({})).toEqual([])
    expect(keys({ a: 1, b: 2 })).toEqual(['a', 'b'])
    expect(
      keys(
        Object.create(
          { a: 1, b: 2 },
          {
            c: { enumerable: true, value: 3 },
            d: { enumerable: true, value: 4 },
          },
        ),
      ),
    ).toEqual(['c', 'd'])
  })

  test('mapValues', () => {
    expect(mapValues({}, (_) => _ * 2)).toEqual({})
    expect(mapValues({ a: 1 }, (_) => _ * 2)).toEqual({ a: 2 })
    expect(mapValues({ a: 1, b: 2 }, (_) => _ * 2)).toEqual({ a: 2, b: 4 })
    expect(mapValues({ a: 1, b: 2 }, (_, k) => k)).toEqual({ a: 'a', b: 'b' })
    expect(
      mapValues(
        Object.create(
          { a: 1, b: 2 },
          {
            c: { enumerable: true, value: 3 },
            d: { enumerable: true, value: 4 },
          },
        ),
        (_, k) => k,
      ),
    ).toEqual({ c: 'c', d: 'd' })
  })

  test('some', () => {
    expect(some({}, () => true)).toBe(false)
    expect(some({ a: 1 }, (v) => v < 2)).toBe(true)
    expect(some({ a: 1 }, (v) => v > 1)).toBe(false)
    expect(some({ a: 1, b: 2 }, (_, k) => k === 'b')).toBe(true)
    expect(
      some(
        Object.create(
          { a: 1, b: 2 },
          {
            c: { enumerable: true, value: 3 },
            d: { enumerable: true, value: 4 },
          },
        ),
        (_, k) => k === 'b',
      ),
    ).toBe(false)
    expect(
      some(
        Object.create(
          { a: 1, b: 2 },
          {
            c: { enumerable: true, value: 3 },
            d: { enumerable: true, value: 4 },
          },
        ),
        (_, k) => k === 'd',
      ),
    ).toBe(true)
  })
})
