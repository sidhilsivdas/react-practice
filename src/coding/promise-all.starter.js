// Your own Promise.all: resolve with all results in input order,
// reject on the first rejection. Plain values count as resolved.
function promiseAll(items) {
  // your code here

}

const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))
promiseAll([wait(30, 'a'), wait(10, 'b'), 'c'])?.then((result) => console.log(result))
