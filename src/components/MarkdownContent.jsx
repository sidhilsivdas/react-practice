import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugify } from '../utils/sections.js'

// plain text of a markdown heading node, e.g. "Fix with `useCallback`" → "Fix with useCallback"
function nodeText(node) {
  if (node.type === 'text') return node.value
  return (node.children || []).map(nodeText).join('')
}

// give every "## " heading an id so tags can scroll to it
const components = {
  h2: ({ node, children }) => (
    <h2 id={slugify(nodeText(node))} className="scroll-mt-6">
      {children}
    </h2>
  ),
}

// Renders an answer / problem written in markdown
function MarkdownContent({ children }) {
  return (
    <div className="prose prose-gray max-w-none prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </Markdown>
    </div>
  )
}

export default MarkdownContent
