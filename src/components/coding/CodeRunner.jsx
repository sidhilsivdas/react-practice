import { useState } from 'react'
import { runCode } from '../../utils/runCode.js'
import { runTs } from '../../utils/runTs.js'
import { formatValue } from '../../utils/formatValue.js'
import CodeEditor from './CodeEditor.jsx'

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

// One row per test: TypeScript problems get "no type errors" + the type tests first,
// then the JS tests (which run on the type-stripped code)
function resultItems(problem, result) {
  const items = []
  if (problem.language === 'ts') {
    const count = result.typeErrors?.length ?? 0
    items.push({
      kind: 'types',
      label: 'Your code has no type errors',
      pass: count === 0,
      detail: `${count} type error${count === 1 ? '' : 's'} (see below)`,
    })
    if (problem.noAny) {
      const lines = result.anyLines ?? []
      items.push({
        kind: 'types',
        label: 'No `any` left in your code',
        pass: !!result.anyLines && lines.length === 0,
        detail: `\`any\` on line ${lines.join(', ')}`,
      })
    }
    problem.typeTests.forEach((test, i) => {
      const r = result.typeResults?.[i]
      items.push({ kind: 'types', label: test.label, pass: !!r?.pass, detail: r?.output })
    })
  }
  problem.tests.forEach((test, i) => {
    const r = result.results?.[i]
    items.push({
      kind: problem.language === 'ts' ? 'runtime' : null,
      label: test.label ?? `${problem.functionName}(${test.args.map((a) => formatValue(a, true)).join(', ')})`,
      pass: !!r?.pass,
      detail: r ? `expected ${formatValue(test.expected, true)} · got ${r.output}` : 'not run',
    })
  })
  return items
}

// Code editor + Run button + test results
function CodeRunner({ problem }) {
  const [code, setCode] = useState(() => loadDraft(problem.id) ?? problem.starter)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  function updateCode(value) {
    setCode(value)
    saveDraft(problem.id, value)
  }

  async function handleRun() {
    setRunning(true)
    const output =
      problem.language === 'ts'
        ? await runTs({ code, tsx: problem.tsx, functionName: problem.functionName, tests: problem.tests, typeTests: problem.typeTests })
        : await runCode({ code, functionName: problem.functionName, tests: problem.tests })
    setResult(output)
    setRunning(false)
  }

  function handleReset() {
    updateCode(problem.starter)
    setResult(null)
  }

  const items = result ? resultItems(problem, result) : []
  const passed = items.filter((item) => item.pass).length
  const total = items.length

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

      <CodeEditor value={code} onChange={updateCode} onRun={handleRun} label="Code editor" />
      <p className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        Tab indents · Ctrl+Enter runs · your code is saved in this browser
        {problem.language === 'ts' && ' · type-checked with TypeScript (strict), the first run loads the compiler'}
      </p>

      {result && (
        <div className="border-t border-gray-200 px-4 py-4">
          {result.error && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 font-mono text-sm text-red-800">❌ {result.error}</p>
          )}
          {(!result.error || result.typeResults) && (
            <>
              <p className={`font-semibold ${passed === total ? 'text-green-700' : 'text-amber-700'}`}>
                {passed === total ? '🎉 ' : ''}
                {passed} / {total} tests passed
              </p>
              <ul className="mt-3 space-y-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className={`rounded border px-3 py-2 font-mono text-xs ${item.pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="break-all">
                      {item.pass ? '✅' : '❌'}{' '}
                      {item.kind && (
                        <span className={`mr-1 rounded px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase ${item.kind === 'types' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                          {item.kind}
                        </span>
                      )}
                      {item.label}
                    </div>
                    {!item.pass && item.detail && <div className="mt-1 break-all pl-6 text-gray-700">{item.detail}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.typeErrors?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500">Type errors</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-gray-900 p-3 text-xs leading-5 text-red-300">
                {result.typeErrors.join('\n\n')}
              </pre>
            </div>
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
