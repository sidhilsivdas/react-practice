// Plain JavaScript debounce (no React)
export function debounce(fn, delay) {
  let timerId

  return function (...args) {
    clearTimeout(timerId) // cancel the previous wait
    timerId = setTimeout(() => fn.apply(this, args), delay)
  }
}
