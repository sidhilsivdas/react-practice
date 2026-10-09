// Return a function that caches results by arguments,
// so the same arguments don't run fn again.
function memoize(fn) {
  // your code here

}

let calls = 0
const square = memoize((n) => { calls++; return n * n })
console.log(square(4), square(4), 'fn ran', calls, 'time(s)')
