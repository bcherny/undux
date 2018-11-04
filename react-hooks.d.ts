import 'react'

declare module 'react' {
  // Unlike the class component setState, the updates are not allowed to be partial
  type SetStateAction<S> = S | ((prevState: S) => S)
  // this technically does accept a second argument, but it's already under a deprecation warning
  // and it's not even released so probably better to not define it.
  type Dispatch<A> = (value: A) => void
  // Unlike redux, the actions _can_ be anything
  type Reducer<S, A> = (prevState: S, action: A) => S
  // The identity check is done with the SameValue algorithm (Object.is), which is stricter than ===
  // TODO (TypeScript 3.0): ReadonlyArray<unknown>
  type InputIdentityList = ReadonlyArray<any>
  // NOTE: the effect callbacks are actually allowed to return anything, but functions are treated
  // specially. I don't think it's intended to accept async functions, should use throw instead of
  // await to properly engage Suspense.
  type EffectCallback = () => void | (() => void)

  interface MutableRefObject<T> {
    current: T
  }
  // This will technically work if you give a Consumer<T> or Provider<T> but it's deprecated and warns
  /**
   * Accepts a context object (the value returned from `React.createContext`) and returns the current
   * context value, as given by the nearest context provider for the given context.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#usecontext
   */
  function useContext<T>(
    context: Context<T> /*, (not public API) observedBits?: number|boolean */
  ): T
  /**
   * Returns a stateful value, and a function to update it.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#usestate
   */
  function useState<S>(
    initialState: S | (() => S)
  ): [S, Dispatch<SetStateAction<S>>]
  /**
   * An alternative to `useState`.
   *
   * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
   * multiple sub-values. It also lets you optimize performance for components that trigger deep
   * updates because you can pass `dispatch` down instead of callbacks.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#usereducer
   */
  function useReducer<S, A>(
    reducer: Reducer<S, A>,
    initialState: S,
    initialAction?: A | null
  ): [S, Dispatch<A>]
  /**
   * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
   * (`initialValue`). The returned object will persist for the full lifetime of the component.
   *
   * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
   * value around similar to how you’d use instance fields in classes.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#useref
   */
  // TODO (TypeScript 3.0): <T extends unknown>
  function useRef<T>(initialValue: T): MutableRefObject<T>
  // convenience overload for refs given as a ref prop as they typically start with a null value
  /**
   * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
   * (`initialValue`). The returned object will persist for the full lifetime of the component.
   *
   * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
   * value around similar to how you’d use instance fields in classes.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#useref
   */
  // TODO (TypeScript 3.0): <T extends unknown>
  function useRef<T>(initialValue: T | null): MutableRefObject<T | null>

  /**
   * The signature is identical to `useEffect`, but it fires synchronously during the same phase that
   * React performs its DOM mutations, before sibling components have been updated. Use this to perform
   * custom DOM mutations.
   *
   * Prefer the standard `useEffect` when possible to avoid blocking visual updates.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#usemutationeffect
   */
  function useMutationEffect(
    effect: EffectCallback,
    inputs?: InputIdentityList
  ): void
  /**
   * The signature is identical to `useEffect`, but it fires synchronously after all DOM mutations.
   * Use this to read layout from the DOM and synchronously re-render. Updates scheduled inside
   * `useLayoutEffect` will be flushed synchronously, before the browser has a chance to paint.
   *
   * Prefer the standard `useEffect` when possible to avoid blocking visual updates.
   *
   * If you’re migrating code from a class component, `useLayoutEffect` fires in the same phase as
   * `componentDidMount` and `componentDidUpdate`.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#uselayouteffect
   */
  function useLayoutEffect(
    effect: EffectCallback,
    inputs?: InputIdentityList
  ): void
  /**
   * Accepts a function that contains imperative, possibly effectful code.
   *
   * @param effect Imperative function that can return a cleanup function
   * @param inputs If present, effect will only activate if the values in the list change.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#useeffect
   */
  function useEffect(effect: EffectCallback, inputs?: InputIdentityList): void
  // NOTE: this does not accept strings, but this will have to be fixed by removing strings from type Ref<T>
  /**
   * `useImperativeMethods` customizes the instance value that is exposed to parent components when using
   * `ref`. As always, imperative code using refs should be avoided in most cases.
   *
   * `useImperativeMethods` should be used with `React.forwardRef`.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#useimperativemethods
   */
  function useImperativeMethods<T, R extends T>(
    ref: Ref<T> | undefined,
    init: () => R,
    inputs?: InputIdentityList
  ): void
  // I made 'inputs' required here and in useMemo as there's no point to memoizing without the memoization key
  // useCallback(X) is identical to just using X, useMemo(() => Y) is identical to just using Y.
  /**
   * `useCallback` will return a memoized version of the callback that only changes if one of the `inputs`
   * has changed.
   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#usecallback
   */
  // TODO (TypeScript 3.0): <T extends (...args: never[]) => unknown>
  function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    inputs: InputIdentityList
  ): T
  /**
   * `useMemo` will only recompute the memoized value when one of the `inputs` has changed.
   *
   * Usage note: if calling `useMemo` with a referentially stable function, also give it as the input in
   * the second argument.
   *
   * ```ts
   * function expensive () { ... }
   *
   * function Component () {
   *   const expensiveResult = useMemo(expensive, [expensive])
   *   return ...
   * }
   * ```
   *   *
   * @version experimental
   * @see https://reactjs.org/docs/hooks-reference.html#usememo
   */
  function useMemo<T>(factory: () => T, inputs: InputIdentityList): T
}
