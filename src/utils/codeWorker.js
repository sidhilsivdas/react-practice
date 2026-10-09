// Runs the user's code in a Web Worker, so a mistake (or an infinite loop)
// can't freeze the page. Posts { type: 'ready' } once loaded, then receives
// { code, functionName, tests } and posts back { type: 'result', logs, results or error }.
import { formatValue, isEqual } from './formatValue.js'

self.onmessage = (event) => {
  const { code, functionName, tests } = event.data
  const logs = []

  const capture = (kind) => (...args) => {
    logs.push({ kind, text: args.map((arg) => formatValue(arg)).join(' ') })
  }
  console.log = capture('log')
  console.info = capture('log')
  console.warn = capture('warn')
  console.error = capture('error')

  let fn
  try {
    // run the code, then hand back the function the tests should call
    fn = new Function(`${code}\n;return typeof ${functionName} === 'function' ? ${functionName} : undefined`)()
  } catch (error) {
    self.postMessage({ type: 'result', logs, error: `${error.name}: ${error.message}` })
    return
  }

  if (!fn) {
    self.postMessage({ type: 'result', logs, error: `Couldn't find a function called ${functionName}. Keep that name so the tests can call it.` })
    return
  }

  const results = tests.map((test) => {
    try {
      const output = fn(...structuredClone(test.args))
      return { pass: isEqual(output, test.expected), output: formatValue(output, true) }
    } catch (error) {
      return { pass: false, output: `${error.name}: ${error.message}` }
    }
  })

  self.postMessage({ type: 'result', logs, results })
}

// tell the page we've loaded, so its time limit only counts running the code
self.postMessage({ type: 'ready' })
