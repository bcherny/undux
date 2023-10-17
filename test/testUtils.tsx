import { JSDOM } from 'jsdom'
import * as React from 'react'
import { createRoot } from 'react-dom/client'

export function withElement(Component: React.ComponentType, f: (div: HTMLDivElement) => void) {
  let { window: { document } } = new JSDOM
  let div = document.createElement('div')
  let root = createRoot(div)
  root.render(<Component />)
  f(div)
}
