// Return a curried version of fn: it collects arguments across calls
// and runs fn once it has fn.length arguments.
// Example: curry((a, b, c) => a + b + c)(1)(2)(3) → 6
function curry(fn) {
  // your code here

}

const add3 = curry((a, b, c) => a + b + c)
console.log(add3(1)(2)(3))
