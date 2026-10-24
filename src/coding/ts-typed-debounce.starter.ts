// Debounce: run fn only after the calls stop for `delay` ms, with the latest arguments.
// The logic is done. Your job: replace the `any`s so the debounced function
// takes EXACTLY the same arguments as fn.
function debounce(fn: any, delay: number): any {
  let timerId: any
  return (...args: any) => {
    clearTimeout(timerId)
    timerId = setTimeout(() => fn(...args), delay)
  }
}

const search = debounce((query: string, page: number) => console.log('Search', query, page), 100)
search('ts', 1)
search(42)        // should be a type error once debounce is typed (then delete this line)
