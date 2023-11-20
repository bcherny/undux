import * as React from 'react'
import { Harness as LegacyHarness } from './Harness.LegacyAPI'
import { Harness as TreeHarness } from './Harness.TreeAPI'
import { createRoot } from 'react-dom/client'

createRoot(document.querySelector('#LegacyAPI')!).render(<LegacyHarness />)
createRoot(document.querySelector('#TreeAPI')!).render(<TreeHarness />)
