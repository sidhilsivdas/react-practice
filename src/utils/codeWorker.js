// Runs the user's code in a Web Worker, so a mistake (or an infinite loop)
// can't freeze the page. Posts { type: 'ready' } once loaded, then receives
// { code, functionName, tests } and posts back { type: 'result', logs, results or error }.
//
// Two kinds of tests:
//   { args: [...], expected }               → calls fn(...args)
//   { label, run: '...code...', expected }  → runs a small async script that uses the
//                                            function by its name (for timers, promises, classes)
import { formatValue, isEqual } from './formatValue.js'

self.onmessage = async (event) => {
  const { code, functionName, tests } = event.data
  const logs = []

  const capture = (kind) => (...args) => {
    logs.push({ kind, text: args.map((arg) => formatValue(arg)).join(' ') })
  }
  console.log = capture('log')
  console.info = capture('log')
  console.warn = capture('warn')
  console.error = capture('error')

  // Run the code and keep the function (or class) the tests should use.
  // `function` declarations are hoisted, so we grab them before the code runs:
  // then the tests still work even if the user's own example lines below throw.
  let fn
  const save = (value) => {
    if (typeof value === 'function') fn = value
  }
  try {
    new Function(
      '__save',
      `try { __save(${functionName}) } catch {}\n${code}\n;__save(typeof ${functionName} === 'function' ? ${functionName} : undefined)`
    )(save)
  } catch (error) {
    const message = `${error.name}: ${error.message}`
    if (!fn || error instanceof SyntaxError) {
      self.postMessage({ type: 'result', logs, error: message })
      return
    }
    logs.push({ kind: 'error', text: `Your code threw: ${message}` })
  }

  if (!fn) {
    self.postMessage({ type: 'result', logs, error: `Couldn't find ${functionName}. Keep that name so the tests can use it.` })
    return
  }

  const results = []
  for (const test of tests) {
    try {
      const output = test.run
        ? await new Function(functionName, `return (async () => {\n${test.run}\n})()`)(fn)
        : await fn(...structuredClone(test.args))
      results.push({ pass: isEqual(output, test.expected), output: formatValue(output, true) })
    } catch (error) {
      results.push({ pass: false, output: `${error?.name ?? 'Error'}: ${error?.message ?? error}` })
    }
  }

  self.postMessage({ type: 'result', logs, results })
}

// tell the page we've loaded, so its time limit only counts running the code
self.postMessage({ type: 'ready' })
