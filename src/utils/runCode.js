// Runs code in a fresh worker and stops it if it takes too long (e.g. an infinite loop).
// The time limit starts once the worker is ready, so a slow first load isn't counted.
export function runCode({ code, functionName, tests, timeoutMs = 3000, loadTimeoutMs = 20000 }) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./codeWorker.js', import.meta.url), { type: 'module' })

    function finish(result) {
      clearTimeout(timerId)
      worker.terminate()
      resolve(result)
    }

    let timerId = setTimeout(() => {
      finish({ logs: [], error: 'The code runner took too long to start. Please try again.' })
    }, loadTimeoutMs)

    worker.onmessage = (event) => {
      if (event.data.type === 'ready') {
        clearTimeout(timerId)
        timerId = setTimeout(() => {
          finish({ logs: [], error: `Stopped after ${timeoutMs / 1000}s. Is there an infinite loop?` })
        }, timeoutMs)
        worker.postMessage({ code, functionName, tests })
        return
      }
      finish(event.data)
    }

    worker.onerror = (event) => {
      event.preventDefault()
      finish({ logs: [], error: event.message || 'Something went wrong while running the code.' })
    }
  })
}
