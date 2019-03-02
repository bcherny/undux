import { JSDOM } from 'jsdom'
import * as React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'

export function withElement(Component: React.ComponentType, f: (div: HTMLDivElement) => void) {
  let { window: { document } } = new JSDOM
  let div = document.createElement('div')
  render(<Component />, div)
  f(div)
  unmountComponentAtNode(div)
}
