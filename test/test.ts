import { afterEach, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import './cyclical-dependencies'
import './emitter'
import './immutable'
import './react/createConnectedStore'
import './react/createStore-class'
import './react/createStore-function'
import './utils'

// Mock console.error so it doesn't spam the terminal
// for expect.toThrow assertions.
let f: any
beforeEach(() => {
  f = jest.spyOn(console, 'error').mockImplementation(jest.fn)
})
afterEach(() => f!.mockRestore())

// import './react/createConnectedStore-context'
// import './react/createConnectedStoreAs'
// import './react/createConnectedStoreAs-context'
