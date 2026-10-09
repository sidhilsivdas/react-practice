import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import allCoding from '../data/coding.js'
import categories from '../data/categories.js'
import Tag from '../components/Tag.jsx'
import MarkdownContent from '../components/MarkdownContent.jsx'
import DifficultyBadge from '../components/coding/DifficultyBadge.jsx'
import CodeRunner from '../components/coding/CodeRunner.jsx'
import HtmlRunner from '../components/coding/HtmlRunner.jsx'

function CodingPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section')
  const { key } = useLocation() // changes on every click, so tapping the same tag scrolls again

  const problem = allCoding.find((p) => p.id === id)
  const category = categories.find((c) => c.id === problem?.category)
  const inSolution = problem?.solutionSections.some((s) => s.slug === section)

  // solutions stay hidden until asked for, unless a tag points into them
  const [showSolution, setShowSolution] = useState(false)
  const solutionVisible = showSolution || inSolution

  // previous / next stay inside the same category
  const problems = allCoding.filter((p) => p.category === problem?.category)
  const index = problems.indexOf(problem)
  const prev = problems[index - 1]
  const next = problems[index + 1]
  const backTo = `/?cat=${problem?.category}&view=coding`

  useEffect(() => {
    setShowSolution(false)
  }, [id])

  // scroll to the chosen section, or to the top when there isn't one
  useEffect(() => {
    const heading = section && document.getElementById(section)
    if (heading) heading.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [id, section, key])

  if (!problem) {
    return (
      <div>
        <p className="text-gray-700">Problem not found.</p>
        <Link to="/?view=coding" className="mt-4 inline-block text-blue-600 hover:underline">
          ← All coding problems
        </Link>
      </div>
    )
  }

  return (
    <article>
      <Link to={backTo} className="text-sm text-blue-600 hover:underline">
        ← {category?.title ?? 'All'} coding
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">{problem.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        {problem.topics.map((topic) => (
          <span key={topic} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
            {topic}
          </span>
        ))}
      </div>

      <div className="mt-8">
        <MarkdownContent>{problem.problem}</MarkdownContent>
      </div>

      {problem.type === 'html' ? (
        <HtmlRunner key={problem.id} problem={problem} />
      ) : (
        <CodeRunner key={problem.id} problem={problem} />
      )}

      <section className="mt-10">
        {solutionVisible ? (
          <>
            <h2 className="text-xl font-bold text-gray-900">💡 Solutions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {problem.solutionSections.map((s) => (
                <Tag key={s.slug} to={`/code/${problem.id}`} section={s} active={s.slug === section} />
              ))}
            </div>
            <div className="mt-6">
              <MarkdownContent>{problem.solution}</MarkdownContent>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-8 text-center">
            <p className="text-gray-600">Try it yourself first, then compare with the solutions.</p>
            <button
              onClick={() => setShowSolution(true)}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              💡 Show solutions
            </button>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {problem.solutionSections.map((s) => (
                <span key={s.slug} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <nav className="mt-12 flex justify-between gap-4 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link to={`/code/${prev.id}`} className="text-blue-600 hover:underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/code/${next.id}`} className="text-right text-blue-600 hover:underline">
            {next.title} →
          </Link>
        )}
      </nav>
    </article>
  )
}

export default CodingPage
