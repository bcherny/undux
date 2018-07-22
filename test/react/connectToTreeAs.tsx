// import { test } from 'ava'
// import * as React from 'react'
// import { Simulate } from 'react-dom/test-utils'
// import { connectToTreeAs, Effects } from '../../src/react/connectToTreeAs'
// import { withElement } from '../testUtils'

// test('it should render (Consumer)', t => {
//   let { Container, Consumer } = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let B = () =>
//     <Consumer>
//       {stores => <button onClick={() => stores.firstStore.set('a')(stores.firstStore.get('a') + 1)}>
//         {stores.firstStore.get('a')}
//       </button>}
//     </Consumer>
//   let A = () => <Container><B /></Container>

//   withElement(A, a => {
//     t.is(a.querySelector('button')!.innerHTML, '1')
//     Simulate.click(a.querySelector('button')!)
//     t.is(a.querySelector('button')!.innerHTML, '2')
//   })
// })

// test('it should render (withStore)', t => {
//   let {Container, withStores} = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let B = withStores(({ firstStore, secondStore }) =>
//     <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//       {firstStore.get('a')}
//     </button>
//   )
//   let A = () => <Container><B /></Container>

//   withElement(A, a => {
//     t.is(a.querySelector('button')!.innerHTML, '1')
//     Simulate.click(a.querySelector('button')!)
//     t.is(a.querySelector('button')!.innerHTML, '2')
//   })
// })

// test('it should render multiple stores (withStore)', t => {
//   let {Container, withStores} = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let B = withStores(({ firstStore, secondStore }) =>
//     <>
//       <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//         {firstStore.get('a')}
//       </button>
//       <button onClick={() => secondStore.set('b')(secondStore.get('b') + 1)}>
//         {secondStore.get('b')}
//       </button>
//     </>
//   )
//   let A = () => <Container><B /></Container>

//   withElement(A, a => {
//     t.is(a.querySelectorAll('button')[0].innerHTML, '1')
//     t.is(a.querySelectorAll('button')[1].innerHTML, '1')
//     Simulate.click(a.querySelectorAll('button')[0])
//     t.is(a.querySelectorAll('button')[0].innerHTML, '2')
//     t.is(a.querySelectorAll('button')[1].innerHTML, '1')
//     Simulate.click(a.querySelectorAll('button')[1])
//     t.is(a.querySelectorAll('button')[0].innerHTML, '2')
//     t.is(a.querySelectorAll('button')[1].innerHTML, '2')
//   })
// })

// test('it should support multiple instances of a store', t => {
//   let {Container, withStores} = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let C = withStores(({ firstStore }) =>
//     <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//       {firstStore.get('a')}
//     </button>
//   )
//   let A = () => <Container><C /></Container>
//   let B = () => <Container><C /></Container>

//   withElement(A, a =>
//     withElement(B, b => {
//       t.is(a.querySelector('button')!.innerHTML, '1')
//       t.is(b.querySelector('button')!.innerHTML, '1')
//       Simulate.click(a.querySelector('button')!)
//       t.is(a.querySelector('button')!.innerHTML, '2')
//       t.is(b.querySelector('button')!.innerHTML, '1')
//       Simulate.click(b.querySelector('button')!)
//       t.is(a.querySelector('button')!.innerHTML, '2')
//       t.is(b.querySelector('button')!.innerHTML, '2')
//     })
//   )
// })

// test('it should support interleaved stores', t => {
//   let A = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let B = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let C = A.withStores(({ firstStore }) =>
//     <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//       {firstStore.get('a')}
//     </button>
//   )
//   let D = B.withStores(({ firstStore }) =>
//     <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//       {firstStore.get('a')}
//     </button>
//   )
//   let X = () => <A.Container>
//     <C />
//     <B.Container>
//       <D />
//       <C />
//     </B.Container>
//   </A.Container>

//   withElement(X, x => {
//     assertButtons(x, 1, 1, 1)
//     Simulate.click(x.querySelectorAll('button')[0])
//     assertButtons(x, 2, 1, 2)
//     Simulate.click(x.querySelectorAll('button')[1])
//     assertButtons(x, 2, 2, 2)
//     Simulate.click(x.querySelectorAll('button')[2])
//     assertButtons(x, 3, 2, 3)
//   })

//   function assertButtons(x: Element, one: number, two: number, three: number) {
//     t.is(x.querySelectorAll('button')[0].innerHTML, one.toString())
//     t.is(x.querySelectorAll('button')[1].innerHTML, two.toString())
//     t.is(x.querySelectorAll('button')[2].innerHTML, three.toString())
//   }
// })

// test('it should support custom initialStates', t => {
//   let { Container, withStores } = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let C = withStores(({ firstStore }) =>
//     <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//       {firstStore.get('a')}
//     </button>
//   )
//   let A = () => <Container initialStates={{ firstStore: { a: 101 } }}> <C /></Container >
//   let B = () => <Container initialStates={{ firstStore: { a: 201 }, secondStore: { b: 201 } }}><C /></Container>

//   withElement(A, a =>
//     withElement(B, b => {
//       t.is(a.querySelector('button')!.innerHTML, '101')
//       t.is(b.querySelector('button')!.innerHTML, '201')
//       Simulate.click(a.querySelector('button')!)
//       t.is(a.querySelector('button')!.innerHTML, '102')
//       t.is(b.querySelector('button')!.innerHTML, '201')
//       Simulate.click(b.querySelector('button')!)
//       t.is(a.querySelector('button')!.innerHTML, '102')
//       t.is(b.querySelector('button')!.innerHTML, '202')
//     })
//   )
// })

// test('it should support effects', t => {
//   t.plan(2)

//   type FirstState = {
//     a: number
//   }

//   type SecondState = {
//     b: number
//   }

//   let { Container, withStores } = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })

//   let withEffects: Effects<{ firstStore: FirstState, secondStore: SecondState }> = stores => {
//     stores.firstStore.on('a').subscribe(a => {
//       t.is(a, 2)
//     })
//     stores.secondStore.on('b').subscribe(b => {
//       t.is(b, 2)
//     })
//   }

//   let C = withStores(({ firstStore, secondStore }) =>
//     <>
//       <button onClick={() => firstStore.set('a')(firstStore.get('a') + 1)}>
//         {firstStore.get('a')}
//       </button>
//       <button onClick={() => secondStore.set('b')(secondStore.get('b') + 1)}>
//         {secondStore.get('b')}
//       </button>
//     </>
//   )
//   let A = () => <Container effects={[withEffects]}>
//     <C />
//   </Container>

//   withElement(A, _ => {
//     Simulate.click(_.querySelectorAll('button')[0])
//     Simulate.click(_.querySelectorAll('button')[1])
//   })
// })

// test('it should eagerly throw at runtime when using a consumer without a container', t => {
//   let {withStores} = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let A = withStores(() => <div />)
//   t.throws(() => withElement(A, _ => {}), /Component is not nested/)
// })

// test.skip('it should eagerly throw at runtime when nesting the same container twice', t => {
//   let {Container, withStores} = connectToTreeAs({
//     firstStore: { a: 1 },
//     secondStore: { b: 1 }
//   })
//   let A = withStores(() => <div />)
//   let B = () => <Container>
//     <Container>
//       <A />
//     </Container>
//   </Container>
//   t.throws(() => withElement(B, _ => {}), /Avoid nesting/)
// })
