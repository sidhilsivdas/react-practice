// Return a function that runs fn only after it stops being called for `delay` ms,
// with the latest arguments.
function debounce(fn, delay) {
  // your code here

}

// Try it: only "rea" should be logged, once
const search = debounce((text) => console.log('Search:', text), 100)
search('r')
search('re')
search('rea')
