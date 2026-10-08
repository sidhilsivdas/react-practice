import { useEffect, useRef, useState } from 'react'

// Returns `value`, updated at most once every `interval` ms
function useThrottle(value, interval = 500) {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastRun = useRef(Date.now())

  useEffect(() => {
    const remaining = interval - (Date.now() - lastRun.current)

    const timerId = setTimeout(() => {
      lastRun.current = Date.now()
      setThrottledValue(value)
    }, Math.max(remaining, 0)) // now if enough time passed, otherwise at the next slot

    return () => clearTimeout(timerId)
  }, [value, interval])

  return throttledValue
}

export default useThrottle
