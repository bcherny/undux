type StartMessage = {
  id: undefined,
  source: '@devtools-extension'
  state: undefined
  type: 'START'
}

type InitMessage = {
  payload: {
    nextLiftedState: object
    preloadedState: undefined
    type: 'IMPORT_STATE'
  }
  state?: undefined
  type: 'DISPATCH'
}

type JumpToActionMessage = {
  id: string
  payload: {
    actionId: number
    type: 'JUMP_TO_ACTION'
  }
  source: '@devtools-extension'
  state: string
  type: 'DISPATCH'
}

type JumpToStateMessage = {
  id: string
  payload: {
    id: number
    type: 'JUMP_TO_STATE'
  }
  source: '@devtools-extension'
  state: string
  type: 'DISPATCH'
}

type PauseMessage = {
  id: string
  payload: {
    status: boolean
    type: 'PAUSE_RECORDING'
  }
  source: '@devtools-extension'
  state: undefined
  type: 'DISPATCH'
}

type ToggleMessage = {
  id: string
  payload: {
    id: number
    type: 'TOGGLE_ACTION'
  }
  source: '@devtools-extension'
  state: string
  type: 'DISPATCH'
}

type Message = StartMessage | InitMessage | JumpToActionMessage
             | JumpToStateMessage | PauseMessage | ToggleMessage

type Devtools = {
  connect(): Devtools
  send(key: string | number | symbol | null, storeState: object): void
  subscribe(f: (message: Message) => void): void
}

declare module 'ReduxDevtoolsExtension' {
  declare global {
    interface Window {
      __REDUX_DEVTOOLS_EXTENSION__?: Devtools
    }
  }
}
