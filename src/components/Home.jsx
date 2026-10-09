import { Link, useSearchParams } from 'react-router'
import questions from '../data/questions.js'
import coding from '../data/coding.js'
import categories from '../data/categories.js'
import { searchQuestions } from '../utils/search.js'
import Tag from './Tag.jsx'
import ComingSoon from './ComingSoon.jsx'
import DifficultyBadge from './coding/DifficultyBadge.jsx'

const DEFAULT_VIEWS = [
  { id: 'questions', label: '📘 Questions', items: questions },
  { id: 'coding', label: '💻 Coding', items: coding },
]

// A category can define its own tabs instead of Questions | Coding,
// e.g. System Design → Frontend | Backend (questions split by their `section`)
function viewsFor(category) {
  if (!category.views) return DEFAULT_VIEWS
  return category.views.map((v) => ({ ...v, items: questions.filter((q) => q.section === v.id) }))
}

function Home() {
  // keep category, view and search text in the URL (?cat=...&view=...&search=...),
  // so they're still there after going back
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') || ''
  const category = categories.find((c) => c.id === searchParams.get('cat')) || categories[0]
  const views = viewsFor(category)
  const view = views.find((v) => v.id === searchParams.get('view')) || views[0]

  const countIn = (items, categoryId) => items.filter((item) => item.category === categoryId).length
  const categoryTotal = (c) => viewsFor(c).reduce((sum, v) => sum + countIn(v.items, c.id), 0)

  const inView = view.items.filter((item) => item.category === category.id)
  const results = searchQuestions(inView, query)

  function updateParams(changes) {
    const next = { cat: category.id, view: view.id, search: query, ...changes }
    if (next.cat === categories[0].id) delete next.cat // defaults need no param
    const nextCategory = categories.find((c) => c.id === next.cat) ?? categories[0]
    if (!next.view || next.view === viewsFor(nextCategory)[0].id) delete next.view
    if (!next.search) delete next.search
    setSearchParams(next, { replace: true })
  }

  const isCoding = view.id === 'coding'
  const noun = isCoding ? 'problem' : 'question'

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">React Practice</h1>
      <p className="mt-2 text-gray-600">
        Interview questions with simple answers, and coding problems you can run in the browser.
      </p>

      {/* category tabs: wrap onto more lines on small screens */}
      <nav className="mt-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const count = categoryTotal(c)
            const selected = c.id === category.id
            return (
              <button
                key={c.id}
                onClick={() => updateParams({ cat: c.id, view: '', search: '' })}
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

      {categoryTotal(category) === 0 ? (
        <ComingSoon category={category} />
      ) : (
        <>
          {/* Questions | Coding switch */}
          <div className="mt-6 inline-flex rounded-lg border border-gray-300 bg-white p-1" role="tablist">
            {views.map((v) => {
              const selected = v.id === view.id
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => updateParams({ view: v.id, search: '' })}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                    selected ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {v.label}
                  <span className={`ml-2 text-xs ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                    {countIn(v.items, category.id)}
                  </span>
                </button>
              )
            })}
          </div>

          {inView.length === 0 ? (
            <p className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-600">
              No {noun}s here yet. Coming soon!
            </p>
          ) : (
            <>
              <div className="mt-4">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => updateParams({ search: e.target.value })}
                  placeholder={isCoding ? 'Search coding problems, e.g. array, Set...' : `Search ${category.title}, e.g. arrow, array, useEffect...`}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                {query && (
                  <p className="mt-2 text-sm text-gray-500">
                    {results.length} {results.length === 1 ? `${noun} matches` : `${noun}s match`}
                    {results.length > 0 && ' · highlighted tags contain your search'}
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-4">
                {results.map(({ question: item, matchedSlugs }) => {
                  const basePath = isCoding ? `/code/${item.id}` : `/q/${item.id}`
                  return (
                    <li
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                    >
                      <h2 className="text-lg font-semibold text-gray-900">
                        <Link to={basePath} className="hover:text-blue-700">
                          <span className="mr-2 text-gray-400">{inView.indexOf(item) + 1}.</span>
                          {item.title}
                        </Link>
                      </h2>

                      {isCoding ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <DifficultyBadge difficulty={item.difficulty} />
                          {item.topics.map((topic) => (
                            <span key={topic} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                              {topic}
                            </span>
                          ))}
                          {/* while searching, show which parts mention it */}
                          {item.sections
                            .filter((s) => matchedSlugs.includes(s.slug))
                            .map((s) => (
                              <Tag key={s.slug} to={basePath} section={s} matched />
                            ))}
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.sections.map((s) => (
                            <Tag key={s.slug} to={basePath} section={s} matched={matchedSlugs.includes(s.slug)} />
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {query && results.length === 0 && (
                <p className="mt-8 text-center text-gray-500">No {noun}s match “{query}”.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Home
