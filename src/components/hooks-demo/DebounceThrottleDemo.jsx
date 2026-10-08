import { useEffect, useRef, useState } from 'react'
import useDebounce from '../../hooks/useDebounce.js'
import useThrottle from '../../hooks/useThrottle.js'
import DemoCard from './DemoCard.jsx'

// counts how many times a value has changed
function useChangeCount(value) {
  const [count, setCount] = useState(0)
  const last = useRef(value)

  useEffect(() => {
    if (last.current === value) return
    last.current = value
    setCount((c) => c + 1)
  }, [value])

  return count
}

// Type fast: see how often each value updates
function DebounceThrottleDemo() {
  const [text, setText] = useState('')
  const debounced = useDebounce(text, 500)
  const throttled = useThrottle(text, 500)

  const typedCount = useChangeCount(text)
  const throttledCount = useChangeCount(throttled)
  const debouncedCount = useChangeCount(debounced)

  const rows = [
    { label: 'Typed (every key)', value: text, count: typedCount, color: 'text-gray-900' },
    { label: 'Throttled (max every 500ms)', value: throttled, count: throttledCount, color: 'text-amber-700' },
    { label: 'Debounced (500ms after you stop)', value: debounced, count: debouncedCount, color: 'text-green-700' },
  ]

  return (
    <DemoCard number={1} title="Debounce vs throttle" hook="useDebounce(text, 500) · useThrottle(text, 500)">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type fast, e.g. hello world"
        className="w-full rounded border border-gray-300 px-3 py-2"
      />

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-2 font-medium">Value</th>
            <th className="pb-2 font-medium">Now</th>
            <th className="pb-2 text-right font-medium">Updates</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-100">
              <td className="py-2 pr-2 text-gray-600">{row.label}</td>
              <td className={`py-2 pr-2 font-mono break-all ${row.color}`}>"{row.value}"</td>
              <td className={`py-2 text-right font-semibold ${row.color}`}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => setText('')}
        className="mt-3 text-sm text-blue-600 hover:underline"
      >
        Clear
      </button>
    </DemoCard>
  )
}

export default DebounceThrottleDemo
