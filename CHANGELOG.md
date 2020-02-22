# Changelog

## 5.2.0

- Moved ES Module export from dist.esnext/index.js to dist.esm/index.js [90fb013](https://github.com/bcherny/undux/commit/90fb013de69685090e464a7f98dce66498f333d3)

## 5.1.0

- Renamed `Connect` type to `CreateConnectedStore`, and added it to top-level exports
- Renamed `ConnectAs` type to `CreateConnectedStoreAs`, and added it to top-level exports

## 5.0.0

- Deprecated `createStore` and `connect` in favor of new top-level `createConnectedStore` method [3909ed9](https://github.com/bcherny/undux/commit/3909ed9e580e37a8989af908706bd5fe3d35879e)
- Deprecated `createStoreAs` and `connect` in favor of new top-level `createConnectedStoreAs` method [3909ed9](https://github.com/bcherny/undux/commit/3909ed9e580e37a8989af908706bd5fe3d35879e)
- Deprecated `Plugin` type in favor of `Effects` [3909ed9](https://github.com/bcherny/undux/commit/3909ed9e580e37a8989af908706bd5fe3d35879e)

### 4.8.0

- Revert 4.7.0 performance update

### 4.7.0

- Performance: only subscribe to changes on those fields that a component uses [2ac3dc8](https://github.com/bcherny/undux/commit/2ac3dc8ed1b12d20ed97e5f4def7cecdca4f01ed)

### 4.6.0

- Add `connectAs` utility for connecting a component to multiple stores [8e2b5f0](https://github.com/bcherny/undux/commit/8e2b5f02429f25bb9b5685fc33c357ab30aa53fd)

### 4.5.0

- Perform dynamic analysis to warn about cycles in effects at runtime [961a187](https://github.com/bcherny/undux/commit/961a1876314e3368e7c6967ba5f7c89927c394e7)
- Performance: Memoize setter to prevent erroneous re-renders [9c968e6](https://github.com/bcherny/undux/commit/9c968e6c154b2d387d87cb27f5dae0a887f57aed)
- Remove `store.before` and `store.beforeAll` APIs (this should have been a major bump to be safe) [276efad](https://github.com/bcherny/undux/commit/276efad0b6a11dde392c44134f78d83324c2ad46)

### 4.4.0

- Add Redux Devtools integration [6052dcb](https://github.com/bcherny/undux/commit/6052dcb3e9bd8b13a860cffd6bf82731a7e2de26)

### 4.3.0

- Add support for RxJS6, and maintain backwards-compatability with RxJS5 [03b6990](https://github.com/bcherny/undux/commit/03b69906ada3d26a6976cada9c2a2b33ccd8305b)

### 4.2.0

- Add `store.getState` API to get an immutable version of the whole state of the store [330ae2c](https://github.com/bcherny/undux/commit/330ae2c1e24367bd951b2d82436cb4dd84263364)

## 4.0.0

- Remove property whitelist, and re-render on all store updates to let React's reconciler do the heavy lifting [bc90f3c](https://github.com/bcherny/undux/commit/bc90f3c8b378813ed01bbcaf2f24ea3ea92da2ba)
- Performance: Introduce `StoreSnapshot` to add support for `shouldComponentUpdate` and other lifecycle methods, and to avoid `forceUpdate` [d85fee1](https://github.com/bcherny/undux/commit/d85fee148fa3f2324fed1527faf8dd0b4cd6b172)
- Migrate from RxJS4 to RxJS5; move RxJS from `dependencies` to `peerDependencies` [85ee792](https://github.com/bcherny/undux/commit/85ee79275095b908833714ebcf44f24e6fdfa76a)

### 3.2.0

- Add built-in support for ImmutableJS [79954f9](https://github.com/bcherny/undux/commit/79954f9a29fb353de9dcf3ad51eedafce821bb3d)

### 3.1.0

- Add support for Flow [94f8fbf](https://github.com/bcherny/undux/commit/94f8fbf0ad65e0871185325b0495de2ebc7e44fe)

## 3.0.0

- Performance: Diff values when the store changes to prevent erroneous re-renders [0644608](https://github.com/bcherny/undux/commit/06446082aade104bf8107a4a24c25a85ea18179d)
- Performance: Don't update unlensed components by default [303fe88](https://github.com/bcherny/undux/commit/303fe8893470170857852bf605124c133a899669)
- Rename from Babydux to Undux [4fbf6b0](https://github.com/bcherny/undux/commit/4fbf6b06f570f1706ee633715087efaf18a78ebc?diff=split&short_path=1bb87d4#diff-1bb87d41d15fe27b500a4bfcde01bb0e)

## 2.0.0

- Pull out logger into a plugin [d0b1229](https://github.com/bcherny/undux/commit/d0b1229ca2270cb694e79b676e0bb07fcafd849e)
- Add `store.before` and `store.beforeAll` APIs that fire with the key, current value, and previous value [b8f4d82](https://github.com/bcherny/undux/commit/b8f4d8292f3a26b6d5ad549d29ec03eb1c5bb0e7)
