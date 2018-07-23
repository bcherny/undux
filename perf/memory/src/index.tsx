import * as React from 'react'
import { render } from 'react-dom'
import { Harness as LegacyHarness } from './Harness.LegacyAPI'
import { Harness as TreeHarness } from './Harness.TreeAPI'

render(<LegacyHarness />, document.querySelector('#LegacyAPI'))
render(<TreeHarness />, document.querySelector('#TreeAPI'))
