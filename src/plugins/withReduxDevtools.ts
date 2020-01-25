import { StoreDefinition } from '..'

export function withReduxDevtools<State extends object>(
  store: StoreDefinition<State>
): StoreDefinition<State> {
  let devtools = window.__REDUX_DEVTOOLS_EXTENSION__

  if (!devtools) {
    console.error(
      'Undux withReduxDevtools plugin: Cannot find Redux Devtools browser extension. Is it installed?'
    )
    return store
  }

  let devTools = devtools.connect()
  let wasTriggeredByDevtools = false

  let jumpToState = (newState: State) => {
    let oldState = store.getState()
    for (let key in newState) {
      if (key in oldState) {
        wasTriggeredByDevtools = true
        store.set(key as keyof State)(newState[key as keyof State])
        wasTriggeredByDevtools = false
      }
    }
  }

  devTools.subscribe(message => {
    switch (message.type) {
      case 'START':
        devTools.send(null, store.getState())
        return
      case 'DISPATCH':
        if (!message.state) {
          return
        }
        switch (message.payload.type) {
          case 'JUMP_TO_ACTION':
          case 'JUMP_TO_STATE':
            jumpToState(JSON.parse(message.state))
        }
    }
  })

  store.onAll().subscribe(({ key }) => {
    if (wasTriggeredByDevtools) {
      return
    }
    devTools.send(key, store.getState())
  })

  return store
}
