import { Store } from '..'

export function withLogger<State extends object>(store: Store<State>): Store<State> {

  store.onAll().subscribe(({ key, previousValue, value }) => {
    console.info(`%c ⥁ ${key}`, 'background-color: rgb(96, 125, 139); color: #fff; padding: 2px 8px 2px 0;', previousValue, '→', value)
  })

  return store
}
