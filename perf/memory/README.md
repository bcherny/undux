# Undux memory bench

Before, Undux only supported the `createStore` API for creating stores. This API is dead simple, but has the significant drawback that it leaks memory. With a large store, this memory leak can be severe:

[![](http://img.youtube.com/vi/apOfLKisEJU/0.jpg)](https://youtu.be/apOfLKisEJU)

The updated Undux `connectToTree` API correctly deallocates a store once it's no longer referenced:

[![](http://img.youtube.com/vi/https://youtu.be/4clJGMF5dIg/0.jpg)](https://youtu.be/https://youtu.be/4clJGMF5dIg)

## Running the profile yourself

```sh
cd perf/memory
yarn install
yarn watch
```

1. Open _http://localhost:8081_ in Chrome
2. Record an initial memory snapshot
3. Press _Allocate_
4. Record memory snapshot
5. Press _Unmount_
6. Record memory snapshot

Expected: Memory allocation in (2) and (5) should be roughly equal.

## TODO

- [ ] Automate this, and run it as part of CI
