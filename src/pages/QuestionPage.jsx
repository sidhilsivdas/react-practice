import { useEffect } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import allQuestions from '../data/questions.js'
import categories from '../data/categories.js'
import Tag from '../components/Tag.jsx'
import MarkdownContent from '../components/MarkdownContent.jsx'

function QuestionPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section')
  const { key } = useLocation() // changes on every click, so tapping the same tag scrolls again

  const question = allQuestions.find((q) => q.id === id)
  const category = categories.find((c) => c.id === question?.category)

  // previous / next stay inside the same category
  const questions = allQuestions.filter((q) => q.category === question?.category)
  const index = questions.indexOf(question)
  const prev = questions[index - 1]
  const next = questions[index + 1]

  // scroll to the chosen section, or to the top when there isn't one
  useEffect(() => {
    const heading = section && document.getElementById(section)
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [id, section, key])

  if (!question) {
    return (
      <div>
        <p className="text-gray-700">Question not found.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          ← All questions
        </Link>
      </div>
    )
  }

  return (
    <article>
      <Link to={`/?cat=${question.category}`} className="text-sm text-blue-600 hover:underline">
        ← {category?.title ?? 'All questions'}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">{question.title}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {question.sections.map((s) => (
          <Tag key={s.slug} to={`/q/${question.id}`} section={s} active={s.slug === section} />
        ))}
      </div>

      <div className="mt-8">
        <MarkdownContent>{question.content}</MarkdownContent>
      </div>

      <nav className="mt-12 flex justify-between gap-4 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link to={`/q/${prev.id}`} className="text-blue-600 hover:underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/q/${next.id}`} className="text-right text-blue-600 hover:underline">
            {next.title} →
          </Link>
        )}
      </nav>
    </article>
  )
}

export default QuestionPage
