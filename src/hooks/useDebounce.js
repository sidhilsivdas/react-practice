import { useEffect, useState } from 'react'

// Returns `value`, but only after it has stopped changing for `delay` ms
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timerId) // value changed again → cancel the old timer
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
