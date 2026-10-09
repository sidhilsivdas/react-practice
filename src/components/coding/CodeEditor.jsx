import { useRef } from 'react'

// A plain textarea that behaves a bit like a code editor:
// Tab inserts two spaces, Ctrl/Cmd + Enter calls onRun
function CodeEditor({ value, onChange, onRun, label, minRows = 10 }) {
  const editorRef = useRef(null)

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onRun?.()
      return
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const { selectionStart, selectionEnd } = e.target
      onChange(value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd))
      requestAnimationFrame(() => {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = selectionStart + 2
      })
    }
  }

  return (
    <textarea
      ref={editorRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      rows={Math.max(minRows, value.split('\n').length + 1)}
      aria-label={label}
      className="block w-full resize-y bg-gray-900 p-4 font-mono text-sm leading-6 text-gray-100 outline-none"
    />
  )
}

export default CodeEditor
