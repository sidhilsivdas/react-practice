import { Link } from 'react-router'

// A tag that opens a question at one of its sections
function Tag({ questionId, section, active }) {
  return (
    <Link
      to={`/q/${questionId}?section=${section.slug}`}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
      }`}
    >
      {section.label}
    </Link>
  )
}

export default Tag
