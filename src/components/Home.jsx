import { Link } from 'react-router'
import questions from '../data/questions.js'
import Tag from './Tag.jsx'

function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">React Practice</h1>
      <p className="mt-2 text-gray-600">
        Interview questions with simple answers. Tap a question to read it, or a tag to jump to that part.
      </p>

      <ul className="mt-8 space-y-4">
        {questions.map((q, index) => (
          <li
            key={q.id}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              <Link to={`/q/${q.id}`} className="hover:text-blue-700">
                <span className="mr-2 text-gray-400">{index + 1}.</span>
                {q.title}
              </Link>
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.sections.map((section) => (
                <Tag key={section.slug} questionId={q.id} section={section} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Home
