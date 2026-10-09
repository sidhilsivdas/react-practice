import { Link } from 'react-router'

// A tag that opens a page at one of its sections, e.g. to="/q/strict-mode"
// active = the section being read, matched = the section contains the search text
function Tag({ to, section, active, matched }) {
  let colors = 'bg-blue-50 text-blue-700 hover:bg-blue-100'
  if (matched) colors = 'bg-amber-100 text-amber-900 ring-1 ring-amber-400 hover:bg-amber-200'
  if (active) colors = 'bg-blue-600 text-white'

  return (
    <Link
      to={`${to}?section=${section.slug}`}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${colors}`}
    >
      {section.label}
    </Link>
  )
}

export default Tag
