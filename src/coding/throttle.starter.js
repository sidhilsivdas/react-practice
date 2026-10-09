// Return a function that runs fn at most once every `wait` ms.
// The first call runs immediately; calls during the wait are ignored.
function throttle(fn, wait) {
  // your code here

}

// Try it: only 1 should be logged
const log = throttle((n) => console.log('run', n), 100)
log(1)
log(2)
log(3)
