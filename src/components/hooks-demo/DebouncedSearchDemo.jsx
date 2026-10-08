import { useEffect, useState } from 'react'
import useDebounce from '../../hooks/useDebounce.js'
import DemoCard from './DemoCard.jsx'

const FRUITS = [
  'Apple', 'Apricot', 'Avocado', 'Banana', 'Blackberry', 'Blueberry', 'Cherry', 'Coconut',
  'Grape', 'Grapefruit', 'Guava', 'Kiwi', 'Lemon', 'Lime', 'Mango', 'Melon', 'Orange',
  'Papaya', 'Peach', 'Pear', 'Pineapple', 'Plum', 'Pomegranate', 'Raspberry', 'Strawberry', 'Watermelon',
]

// Pretend server: answers after 400ms, can be cancelled with an AbortController
function fakeSearchApi(query, signal) {
  return new Promise((resolve, reject) => {
    const timerId = setTimeout(() => {
      resolve(FRUITS.filter((f) => f.toLowerCase().includes(query.toLowerCase())))
    }, 400)
    signal.addEventListener('abort', () => {
      clearTimeout(timerId)
      reject(new DOMException('Request cancelled', 'AbortError'))
    })
  })
}

// Search box: compare API calls with and without debounce
function DebouncedSearchDemo() {
  const [query, setQuery] = useState('')
  const [useDebouncing, setUseDebouncing] = useState(true)
  const debouncedQuery = useDebounce(query, 500)
  const searchTerm = useDebouncing ? debouncedQuery : query

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiCalls, setApiCalls] = useState(0)

  useEffect(() => {
    if (!searchTerm) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setApiCalls((n) => n + 1)

    fakeSearchApi(searchTerm, controller.signal)
      .then((data) => {
        setResults(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })

    return () => controller.abort() // a newer search started → cancel this one
  }, [searchTerm])

  return (
    <DemoCard number={2} title="Search box calling an API" hook="useDebounce(query, 500) + AbortController">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={useDebouncing} onChange={(e) => setUseDebouncing(e.target.checked)} />
        Use debounce
      </label>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search fruits, e.g. berry"
        className="mt-3 w-full rounded border border-gray-300 px-3 py-2"
      />

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{loading ? 'Searching…' : `${results.length} results`}</span>
        <span className={`rounded-full px-3 py-1 font-semibold ${useDebouncing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          API calls: {apiCalls}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {results.map((fruit) => (
          <li key={fruit} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{fruit}</li>
        ))}
      </ul>

      <button
        onClick={() => {
          setQuery('')
          setApiCalls(0)
        }}
        className="mt-3 text-sm text-blue-600 hover:underline"
      >
        Reset
      </button>
    </DemoCard>
  )
}

export default DebouncedSearchDemo
