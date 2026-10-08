import { useCallback, useEffect, useRef } from 'react'

// Returns a function that runs `callback` only after calls stop for `delay` ms
function useDebouncedCallback(callback, delay = 500) {
  const timerRef = useRef(null) // survives re-renders
  const callbackRef = useRef(callback)

  // always call the latest callback (no stale closures)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // don't fire after the component is gone
  useEffect(() => () => clearTimeout(timerRef.current), [])

  // same function on every render
  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay)
    },
    [delay]
  )
}

export default useDebouncedCallback
