<img src="logo.png" width="362" alt="undux" />

[![Build Status][build]](https://circleci.com/gh/bcherny/undux) [![npm]](https://www.npmjs.com/package/undux) [![mit]](https://opensource.org/licenses/MIT)

[build]: https://img.shields.io/circleci/project/bcherny/undux.svg?branch=master&style=flat-square
[npm]: https://img.shields.io/npm/v/undux.svg?style=flat-square
[mit]: https://img.shields.io/npm/l/undux.svg?style=flat-square

> Dead simple state management for React

## Install

```sh
# Using Yarn:
yarn add undux

# Or, using NPM:
npm install undux --save
```

## Design Goals

1. Complete type-safety, no exceptions
2. One file: forget actions, reducers, dispatchers, containers, etc.
3. Familiar abstractions

[Read more here](https://github.com/bcherny/undux#design-philosophy)

## Use

### 1. Create a store

```ts
import { connect, createStore } from 'undux'

// If you're using Undux with TypeScript, declare your store's types.
type Store = {
  today: Date
  users: string[]
}

// Create a store with an initial value.
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

// Update the component when `today` changes
let MyComponent = withStore('today')(({ store }) =>
  <div>
    Hello! Today is {store.get('today')}
    <button onClick={() => store.set('today')(new Date)}>Update Date</button>
  </div>
)
```

**That's all there is to it.**

## Features

### Effects

Though Undux automatically updates your model for you, it also lets you listen on and react to model updates (similarly to how vanilla Redux lets you subscribe to Actions). Undux subscriptions are full [Rx observables](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html), so you have fine control over how you react to a change:

```tsx
store
  .on('today')
  .filter(_ => _.getTime() % 2 === 0) // only even timestamps
  .debounce(100)
  .subscribe(_ => console.log('Date changed', _))
```

### Lensed connects

Instead of updating your React component when anything on the model changed, with Undux you subscribe just to specific properties on your model. Notice how in our React example we only update when `today` changes:

```tsx
let MyComponent = withStore('today')(
  ({ store }) => ...
)
```

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

If you create your store with `withLogger` higher order store, all model updates (which key was updated, previous value, and new value) will be logged to the console.

To enable the logger, simply import `withLogger` and wrap your store with it:

```ts
import { createStore, withLogger } from 'undux'

let store = withLogger(createStore<Store>({...}, true))
```

The logger will produce logs that look like this:

<img src="logger.png" width="895" />

### Plugins

Undux is easy to modify with plugins (also called "higher order stores"). Just define a function that takes a store as an argument and returns a store, adding listeners along the way. For convenience, Undux supports 2 types of listeners for plugins:

```ts
import { createStore, Plugin } from 'undux'

let withLocalStorage: Plugin = store => {

  // Listen on an event
  store.onAll().subscribe(_ =>
    console.log('something changed!', _)
  )

  // Listen on an event (fires before the model is updated)
  store.beforeAll().subscribe(({ key, previousValue, value }) =>
    localStorage.set(key, value)
  )

}
```

*Undux also supports `.on()` and `.before()`, but because a plugin doesn't know what Actions will be bound to it, these are generally unsafe to use.*

## Recipes

### Creating a store

```ts
import { connect, createStore, Store } from 'undux'

type MyStore = {
  foo: number
  bar: string[]
}

let store = createStore<MyStore>({
  foo: 12,
  bar: []
})

export type StoreProps = {
  store: Store<MyStore>
}

export let withStore = connect(store)
```

### Stateless component with props

Have your own props? No problem.

```ts
import { withStore } from './store'

type Props = {
  foo: number
}

let MyComponent = withStore('today')<Props>(({ foo, store }) =>
  <div>
    Today is {store.get('today')}
    Foo is {foo}
  </div>
)

<MyComponent foo={3} />
```

### Stateful component with props

Undux is as easy to use with stateful components as with stateless ones.

```ts
import { StoreProps, withStore } from './store'

type Props = {
  foo: number
}

let MyComponent = withStore('today')(class extends React.Component<StoreProps & Props>{
  render() {
    <div>
      Today is {this.props.store.get('today')}
      Foo is {this.props.foo}
    </div>
  }
})

<MyComponent foo={3} />
```

## Design philosophy

**Goal #1 is total type-safety.**

Getting, setting, reading, and listening on model updates is 100% type-safe: use a key that isn't defined in your model or set a key to the wrong type, and you'll get a compile-time error. And connected components are just as type-safe.

**Goal #2 is letting you write as little boilerplate as possible.**

Undux is like [Redux](http://redux.js.org/), but reducers are already baked-in. Undux automatically creates an action and a reducer for each key on your state, so you don't have to write tedious boilerplate. Undux still emits Actions under the hood (which you can listen on to produce effects), but gives you an incredibly simple `get`/`set` API that covers most use cases.

If you're using Undux with the provided React connector, Undux will update your React component any time a reducer fires (just like [React-Redux](https://github.com/reactjs/react-redux)). You can optionally filter on specific state keys that you care about for more targeted updates.

**Goal #3 is familiar abstractions.**

No need to learn about Actions, Reducers, or any of that. Just call `get` and `set`, and everything works just as you expect.

## Tests

```sh
yarn test
```

## License

MIT
