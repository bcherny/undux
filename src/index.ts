import { Emitter } from 'typed-rx-emitter'

export class Store<Actions extends object> extends Emitter<Actions> {
  private emitter = new Emitter<Actions>()
  constructor(private state: Actions, debug = false) {
    super()

    for (let key in state) {
      this.emitter.on(key).subscribe(value => {
        let previousValue = state[key]
        state[key] = value
        this.emit(key, value)

        if (debug) {
          console.info(`%c ⥁ ${key}`, 'background-color: rgb(96, 125, 139); color: #fff; padding: 2px 8px 2px 0;', previousValue, '→', value)
        }
      })
    }
  }
  get<K extends keyof Actions>(key: K) {
    return this.state[key]
  }
  set<K extends keyof Actions>(key: K, value: Actions[K]) {
    return this.emitter.emit(key, value)
  }
}

export function createStore<Actions extends object>(
  initialState: Actions,
  debug = false
) {
  return new Store<Actions>(initialState, debug)
}
