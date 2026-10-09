import { useRef, useState } from 'react'
import { runCode } from '../../utils/runCode.js'
import { formatValue } from '../../utils/formatValue.js'

// keep each problem's draft in this browser (it's fine if storage is blocked)
function loadDraft(id) {
  try {
    return localStorage.getItem(`code-draft:${id}`)
  } catch {
    return null
  }
}

function saveDraft(id, code) {
  try {
    localStorage.setItem(`code-draft:${id}`, code)
  } catch {
    // storage unavailable: drafts just won't be remembered
  }
}

// Code editor + Run button + test results
function CodeRunner({ problem }) {
  const [code, setCode] = useState(() => loadDraft(problem.id) ?? problem.starter)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const editorRef = useRef(null)

  function updateCode(value) {
    setCode(value)
    saveDraft(problem.id, value)
  }

  async function handleRun() {
    setRunning(true)
    const output = await runCode({ code, functionName: problem.functionName, tests: problem.tests })
    setResult(output)
    setRunning(false)
  }

  function handleReset() {
    updateCode(problem.starter)
    setResult(null)
  }

  function handleKeyDown(e) {
    // Ctrl/Cmd + Enter runs the code
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleRun()
      return
    }
    // Tab inserts two spaces instead of leaving the editor
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const { selectionStart, selectionEnd } = e.target
      updateCode(code.slice(0, selectionStart) + '  ' + code.slice(selectionEnd))
      requestAnimationFrame(() => {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = selectionStart + 2
      })
    }
  }

  const passed = result?.results?.filter((r) => r.pass).length ?? 0
  const total = problem.tests.length

  return (
    <section className="mt-10 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-900">✍️ Try it yourself</h2>
        <div className="flex gap-2">
          <button onClick={handleReset} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Reset
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {running ? 'Running…' : '▶ Run tests'}
          </button>
        </div>
      </div>

      <textarea
        ref={editorRef}
        value={code}
        onChange={(e) => updateCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={Math.max(10, code.split('\n').length + 1)}
        aria-label="Code editor"
        className="block w-full resize-y bg-gray-900 p-4 font-mono text-sm leading-6 text-gray-100 outline-none"
      />
      <p className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        Tab indents · Ctrl+Enter runs · your code is saved in this browser
      </p>

      {result && (
        <div className="border-t border-gray-200 px-4 py-4">
          {result.error ? (
            <p className="rounded bg-red-50 px-3 py-2 font-mono text-sm text-red-800">❌ {result.error}</p>
          ) : (
            <>
              <p className={`font-semibold ${passed === total ? 'text-green-700' : 'text-amber-700'}`}>
                {passed === total ? '🎉 ' : ''}
                {passed} / {total} tests passed
              </p>
              <ul className="mt-3 space-y-2">
                {result.results.map((r, i) => {
                  const test = problem.tests[i]
                  return (
                    <li
                      key={i}
                      className={`rounded border px-3 py-2 font-mono text-xs ${r.pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                    >
                      <div className="break-all">
                        {r.pass ? '✅' : '❌'} {problem.functionName}({test.args.map((a) => formatValue(a, true)).join(', ')})
                      </div>
                      {!r.pass && (
                        <div className="mt-1 break-all pl-6 text-gray-700">
                          expected {formatValue(test.expected, true)} · got {r.output}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {result.logs?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500">Console</p>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs leading-5">
                {result.logs.map((log, i) => (
                  <div key={i} className={log.kind === 'error' ? 'text-red-400' : log.kind === 'warn' ? 'text-amber-300' : 'text-gray-100'}>
                    {log.text}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default CodeRunner
