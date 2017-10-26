# Babydux [![Build Status][build]](https://circleci.com/gh/bcherny/babydux) [![npm]](https://www.npmjs.com/package/babydux) [![mit]](https://opensource.org/licenses/MIT)

[build]: https://img.shields.io/circleci/project/bcherny/babydux.svg?branch=master&style=flat-square
[npm]: https://img.shields.io/npm/v/babydux.svg?style=flat-square
[mit]: https://img.shields.io/npm/l/babydux.svg?style=flat-square

> Typesafe Redux for babies

## Install

```sh
# Using Yarn:
yarn add babydux

# Or, using NPM:
npm install babydux --save
```

## Use

### 1. Create a store

```ts
import { createStore } from 'babydux'

// If you're using Babydux with TypeScript, declare your store's types.
type Store = {
  today: Date
  users: string[]
}

// Create a store. The 1st argument is the store's initial value,
// the 2nd argument is whether we're in debug mode (if we are, model
// changes will be logged out in devtools).
export let store = createStore<Store>({
  today: new Date,
  users: []
}, true)
```

### 2. Connect your React components

```tsx
import { connect } from 'babydux/react'
import { store } from './store'

let MyComponent = connect(store)(({ store }) =>
  <div>
    Hello! Today is {store.get('today')}
    <button onClick={() => store.set('today', new Date)}>Update Date</button>
  </div>
)
```

### 3. (Optional) Add side effects

```tsx
store
  .on('today')
  .filter(_ => _.getTime() % 2 === 0) // only even timestamps
  .debounce(100)
  .subscribe(_ => console.log('Date changed', _))
```

## Design philosophy

**Goal #1 is total type-safety.**

**Goal #2 is letting you write as little boilerplate as possible.**

Babydux is like Redux, but reducers are already baked-in. Babydux automatically creates an action and a reducer for each key on your state.

You can optionally listen into actions using the `.on` API. Rather than being just a callback like in Redux reducers, `.on` gives an Rx observable, which you can `filter`, `debounce`, and so on.

If you're using Babydux with the provided React connector, Babydux will update your React component any time a reducer fires (just like Redux). You can optionally filter on specific state keys that you care about for more targeted updates.

## Tests

```sh
yarn test
```

## License

MIT
