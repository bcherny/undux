(require as any)('jsdom-global')()

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import './cyclical-dependencies'
import './emitter'
import './immutable'
import './react/createConnectedStore'
import './react/createConnectedStore-context'
import './react/createConnectedStoreAs'
import './react/createConnectedStoreAs-context'
import './stateful'
import './stateless'
import './utils'
