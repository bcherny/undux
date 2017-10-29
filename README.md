<img src="logo.png" width="362" alt="Babydux" />

[![Build Status][build]](https://circleci.com/gh/bcherny/babydux) [![npm]](https://www.npmjs.com/package/babydux) [![mit]](https://opensource.org/licenses/MIT)

[build]: https://img.shields.io/circleci/project/bcherny/babydux.svg?branch=master&style=flat-square
[npm]: https://img.shields.io/npm/v/babydux.svg?style=flat-square
[mit]: https://img.shields.io/npm/l/babydux.svg?style=flat-square

> A paper-thin, 100% typesafe Redux for babies

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
import { connect, createStore } from 'babydux'

// If you're using Babydux with TypeScript, declare your store's types.
type Store = {
  today: Date
  users: string[]
}

// Create a store. The 1st argument is the store's initial value,
// the 2nd argument is whether we're in debug mode (if we are, model
// changes will be logged out in devtools).
let store = createStore<Store>({
  today: new Date,
  users: []
})

export let withStore = connect(store)
```

*Be sure to define a key for each value in your model, even if the value is initially `undefined`.*

### 2. Connect your React components

```tsx
import { withStore } from './store'

let MyComponent = withStore()(({ store }) =>
  <div>
    Hello! Today is {store.get('today')}
    <button onClick={() => store.set('today')(new Date)}>Update Date</button>
  </div>
)
```

**That's all there is to it.**

## Features

### Effects

Though Babydux automatically updates your model for you, it also lets you listen on and react to model updates (similarly to how vanilla Redux lets you subscribe to Actions). Babydux subscriptions are full Rx observables, so you have fine control over how you react to a change:

```tsx
store
  .on('today')
  .filter(_ => _.getTime() % 2 === 0) // only even timestamps
  .debounce(100)
  .subscribe(_ => console.log('Date changed', _))
```

### Lensed connects

Instead of updating your React component when anything on the model changed, you can subscribe just to specific properties on your model. Let's modify our React example to only update when `today` changes:

```tsx
let MyComponent = withStore('today')(
  ({ store }) => ...
)
```

*Everything is the same as before, I just added `'today'` as an argument to the function returned by `connect`.*

### Partial application all the way through

Partially apply the `connect` function to yield a convenient `withStore` function:

```tsx
let withStore = connect(store)
```

Or, partially apply the `set` function to yield a convenient setter:

```tsx
let setUsers = store.set('users')
setUsers(['amy'])
setUsers(['amy', 'bob'])
```

### Built-in logger

If you create your store with the debug flag set to `true`, all model updates (which key was updated, previous value, and new value) will be logged to the console.

To enable debug mode, pass `true` as the second argument to `createStore`:

```ts
let store = createStore<Store>({...}, true)
```

And logs look like this:

<img src="logger.png" width="895" />

## Design philosophy

**Goal #1 is total type-safety.**

Getting, setting, reading, and listening on model updates is 100% type-safe: use a key that isn't defined in your model or set a key to the wrong type, and you'll get a compile-time error. And connected components are just as type-safe.

**Goal #2 is letting you write as little boilerplate as possible.**

Babydux is like [Redux](http://redux.js.org/), but reducers are already baked-in. Babydux automatically creates an action and a reducer for each key on your state, so you don't have to write tedious boilerplate. Babydux still emits Actions under the hood (which you can listen on to produce effects), but gives you an incredibly simple `get`/`set` API that covers most use cases.

If you're using Babydux with the provided React connector, Babydux will update your React component any time a reducer fires (just like [React-Redux](https://github.com/reactjs/react-redux)). You can optionally filter on specific state keys that you care about for more targeted updates.

## Tests

```sh
yarn test
```

## License

MIT
