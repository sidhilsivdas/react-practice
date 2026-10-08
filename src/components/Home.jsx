import { Link, useSearchParams } from 'react-router'
import questions from '../data/questions.js'
import categories from '../data/categories.js'
import { searchQuestions } from '../utils/search.js'
import Tag from './Tag.jsx'
import ComingSoon from './ComingSoon.jsx'

function Home() {
  // keep the category and search text in the URL (?cat=...&search=...),
  // so they're still there after going back
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') || ''
  const category = categories.find((c) => c.id === searchParams.get('cat')) || categories[0]

  const inCategory = questions.filter((q) => q.category === category.id)
  const results = searchQuestions(inCategory, query)

  function updateParams(changes) {
    const next = { cat: category.id, search: query, ...changes }
    if (next.cat === categories[0].id) delete next.cat // default category needs no param
    if (!next.search) delete next.search
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">React Practice</h1>
      <p className="mt-2 text-gray-600">
        Interview questions with simple answers. Tap a question to read it, or a tag to jump to that part.
      </p>

      {/* category tabs: wrap onto more lines on small screens */}
      <nav className="mt-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const count = questions.filter((q) => q.category === c.id).length
            const selected = c.id === category.id
            return (
              <button
                key={c.id}
                onClick={() => updateParams({ cat: c.id })}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition sm:px-4 sm:py-2 ${
                  selected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                }`}
              >
                <span>{c.icon}</span>
                {c.title}
                <span
                  className={`rounded-full px-2 text-xs ${
                    selected ? 'bg-white/20' : count ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {count || 'Soon'}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {inCategory.length === 0 ? (
        <ComingSoon category={category} />
      ) : (
        <>
          <div className="mt-6">
            <input
              type="search"
              value={query}
              onChange={(e) => updateParams({ search: e.target.value })}
              placeholder={`Search ${category.title}, e.g. arrow, array, useEffect...`}
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
                    <span className="mr-2 text-gray-400">{inCategory.indexOf(q) + 1}.</span>
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
        </>
      )}
    </div>
  )
}

export default Home
