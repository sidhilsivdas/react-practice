import { useState } from 'react'
import useDebounce from '../../hooks/useDebounce.js'
import { buildDocument, runHtmlChecks } from '../../utils/runHtmlChecks.js'
import CodeEditor from './CodeEditor.jsx'

const FILES = [
  { id: 'html', label: 'index.html' },
  { id: 'css', label: 'styles.css' },
]

// keep each problem's draft in this browser (it's fine if storage is blocked)
function loadDraft(problem) {
  try {
    const saved = JSON.parse(localStorage.getItem(`html-draft:${problem.id}`))
    if (saved && typeof saved.html === 'string' && typeof saved.css === 'string') return saved
  } catch {
    // no draft
  }
  return { html: problem.starterHtml, css: problem.starterCss }
}

function saveDraft(id, code) {
  try {
    localStorage.setItem(`html-draft:${id}`, JSON.stringify(code))
  } catch {
    // storage unavailable: drafts just won't be remembered
  }
}

// HTML + CSS editors, live preview, and layout checks
function HtmlRunner({ problem }) {
  const [code, setCode] = useState(() => loadDraft(problem))
  const [activeFile, setActiveFile] = useState('css')
  const [results, setResults] = useState(null)
  const [checking, setChecking] = useState(false)

  // update the preview 300ms after typing stops, instead of on every key
  const previewDoc = useDebounce(buildDocument(code.html, code.css), 300)

  function updateFile(file, value) {
    const next = { ...code, [file]: value }
    setCode(next)
    saveDraft(problem.id, next)
  }

  async function handleCheck() {
    setChecking(true)
    setResults(await runHtmlChecks(buildDocument(code.html, code.css), problem.checks))
    setChecking(false)
  }

  function handleReset() {
    const starter = { html: problem.starterHtml, css: problem.starterCss }
    setCode(starter)
    saveDraft(problem.id, starter)
    setResults(null)
  }

  const passed = results?.filter((r) => r.pass).length ?? 0
  const total = problem.checks.length

  return (
    <section className="mt-10 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-900">✍️ Try it yourself</h2>
        <div className="flex gap-2">
          <button onClick={handleReset} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Reset
          </button>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {checking ? 'Checking…' : '✓ Check'}
          </button>
        </div>
      </div>

      {/* file tabs */}
      <div className="flex bg-gray-800" role="tablist">
        {FILES.map((file) => (
          <button
            key={file.id}
            role="tab"
            aria-selected={activeFile === file.id}
            onClick={() => setActiveFile(file.id)}
            className={`px-4 py-2 font-mono text-xs ${
              activeFile === file.id ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {file.label}
          </button>
        ))}
      </div>
      <CodeEditor
        key={activeFile}
        value={code[activeFile]}
        onChange={(value) => updateFile(activeFile, value)}
        onRun={handleCheck}
        label={`${activeFile.toUpperCase()} editor`}
        minRows={8}
      />
      <p className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        Tab indents · Ctrl+Enter checks · preview updates as you type · saved in this browser
      </p>

      <div className="border-t border-gray-200 px-4 py-4">
        <p className="text-xs font-medium text-gray-500">Preview</p>
        <iframe
          title="Preview"
          sandbox=""
          srcDoc={previewDoc}
          className="mt-1 h-96 w-full rounded border border-gray-300 bg-white"
        />
      </div>

      {results && (
        <div className="border-t border-gray-200 px-4 py-4">
          <p className={`font-semibold ${passed === total ? 'text-green-700' : 'text-amber-700'}`}>
            {passed === total ? '🎉 ' : ''}
            {passed} / {total} checks passed
          </p>
          <ul className="mt-3 space-y-2">
            {results.map((r, i) => (
              <li
                key={i}
                className={`rounded border px-3 py-2 text-sm ${r.pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div>
                  {r.pass ? '✅' : '❌'} {problem.checks[i].label}
                </div>
                {!r.pass && r.message && <div className="mt-1 pl-6 text-gray-700">{r.message}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default HtmlRunner
