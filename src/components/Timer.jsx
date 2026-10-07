import { useEffect, useRef, useState } from 'react'

function Timer() {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef(null) // holds the interval id between renders

  // clear the interval when the component unmounts
  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function start() {
    if (intervalRef.current) return // already running
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
  }

  function stop() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  function reset() {
    stop()
    setSeconds(0)
  }

  return (
    <div className="rounded-lg border-2 border-gray-300 bg-white p-6 text-center">
      <h2 className="mb-4 text-5xl font-bold">{seconds}s</h2>
      <div className="flex gap-2">
        <button onClick={start} className="rounded bg-green-500 px-4 py-2 text-white">Start</button>
        <button onClick={stop} className="rounded bg-red-500 px-4 py-2 text-white">Stop</button>
        <button onClick={reset} className="rounded bg-gray-500 px-4 py-2 text-white">Reset</button>
      </div>
    </div>
  )
}

export default Timer
