// Type-checks TypeScript in a worker that stays alive between runs (loading the
// compiler and its type files is the slow part), then runs the type-stripped JS
// through the normal runner so the JS tests work exactly like the JS problems.
import { runCode } from './runCode.js'

let worker = null
let ready = null // resolves once the worker has loaded
let nextId = 0
const pending = new Map()

function startWorker() {
  worker = new Worker(new URL('./tsWorker.js', import.meta.url), { type: 'module' })
  ready = new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data.type === 'ready') return resolve()
      pending.get(event.data.id)?.(event.data)
      pending.delete(event.data.id)
    }
    worker.onerror = (event) => {
      event.preventDefault()
      reject(new Error(event.message || 'The TypeScript checker failed to load.'))
    }
  })
}

function stopWorker() {
  worker?.terminate()
  worker = null
  for (const resolve of pending.values()) resolve({ error: 'The TypeScript checker was restarted.' })
  pending.clear()
}

function withTimeout(promise, ms, message) {
  let timerId
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId))
}

async function typeCheck({ code, tsx, typeTests }) {
  if (!worker) startWorker()
  try {
    await withTimeout(ready, 60000, 'The TypeScript checker took too long to load. Please try again.')
    const id = nextId++
    const result = new Promise((resolve) => pending.set(id, resolve))
    worker.postMessage({ id, code, tsx, typeTests })
    return await withTimeout(result, 20000, 'Type-checking took too long. Is a type recursing forever?')
  } catch (error) {
    stopWorker()
    return { error: error.message }
  }
}

// → { typeErrors, typeResults, anyLines, logs, results, error }
export async function runTs({ code, tsx, functionName, tests = [], typeTests = [] }) {
  const checked = await typeCheck({ code, tsx, typeTests })
  if (checked.error) return { logs: [], error: checked.error }

  const { js, ...types } = checked
  if (!tests.length) return { ...types, logs: [], results: [] }

  // types are erased at runtime, so the JS tests run even if there are type errors (just like tsc)
  const run = await runCode({ code: js, functionName, tests })
  return { ...types, ...run }
}
