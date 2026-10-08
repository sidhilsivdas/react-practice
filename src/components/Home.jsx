import { Link, useSearchParams } from 'react-router'
import questions from '../data/questions.js'
import { searchQuestions } from '../utils/search.js'
import Tag from './Tag.jsx'

function Home() {
  // keep the search text in the URL (?search=...), so it's still there after going back
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') || ''
  const results = searchQuestions(questions, query)

  function handleSearch(e) {
    const value = e.target.value
    setSearchParams(value ? { search: value } : {}, { replace: true })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">React Practice</h1>
      <p className="mt-2 text-gray-600">
        Interview questions with simple answers. Tap a question to read it, or a tag to jump to that part.
      </p>

      <div className="mt-6">
        <input
          type="search"
          value={query}
          onChange={handleSearch}
          placeholder="Search questions, e.g. arrow, array, useEffect..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        {query && (
          <p className="mt-2 text-sm text-gray-500">
            {results.length} {results.length === 1 ? 'question matches' : 'questions match'}
            {results.length > 0 && ' · highlighted tags contain your search'}
          </p>
        )}
      </div>

      <ul className="mt-6 space-y-4">
        {results.map(({ question: q, matchedSlugs }) => (
          <li
            key={q.id}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              <Link to={`/q/${q.id}`} className="hover:text-blue-700">
                <span className="mr-2 text-gray-400">{questions.indexOf(q) + 1}.</span>
                {q.title}
              </Link>
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.sections.map((section) => (
                <Tag
                  key={section.slug}
                  questionId={q.id}
                  section={section}
                  matched={matchedSlugs.includes(section.slug)}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      {query && results.length === 0 && (
        <p className="mt-8 text-center text-gray-500">No questions match “{query}”.</p>
      )}
    </div>
  )
}

export default Home
