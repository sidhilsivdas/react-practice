// Coding problems. To add one:
// 1. src/coding/<id>.md: problem, then a "<!-- SOLUTION -->" line, then the solutions
// 2. src/coding/<id>.starter.js: the code the editor starts with
// 3. an entry below with the function (or class) name and tests:
//    { args: [...], expected }               → calls fn(...args)
//    { label, run: '...code...', expected }  → an async script using the function by name
//                                             (for callbacks, timers, promises, classes)
import { getSections } from '../utils/sections.js'

// every src/coding/*.md and *.starter.js file, as text
const markdown = import.meta.glob('../coding/*.md', { query: '?raw', import: 'default', eager: true })
const starters = import.meta.glob('../coding/*.starter.js', { query: '?raw', import: 'default', eager: true })

const SOLUTION_MARKER = '<!-- SOLUTION -->'
const WAIT = 'const wait = (ms) => new Promise((r) => setTimeout(r, ms))\n'

const coding = [
  {
    id: 'remove-duplicates',
    title: 'Remove duplicates from an array',
    difficulty: 'Easy',
    topics: ['Arrays', 'Set', 'filter', 'Time complexity'],
    functionName: 'removeDuplicates',
    tests: [
      { args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] },
      { args: [['a', 'b', 'a', 'c', 'b']], expected: ['a', 'b', 'c'] },
      { args: [[1, '1', 1, '1']], expected: [1, '1'] },
      { args: [[NaN, 1, NaN]], expected: [NaN, 1] },
      { args: [[5, 5, 5, 5]], expected: [5] },
      { args: [[]], expected: [] },
    ],
  },
  {
    id: 'valid-palindrome',
    title: 'Valid palindrome',
    difficulty: 'Easy',
    topics: ['Strings', 'Two pointers', 'Regex'],
    functionName: 'isPalindrome',
    tests: [
      { args: ['racecar'], expected: true },
      { args: ['Madam'], expected: true },
      { args: ['A man, a plan, a canal: Panama'], expected: true },
      { args: ['race a car'], expected: false },
      { args: ['12321'], expected: true },
      { args: ['ab'], expected: false },
      { args: [''], expected: true },
    ],
  },
  {
    id: 'valid-anagram',
    title: 'Valid anagram',
    difficulty: 'Easy',
    topics: ['Strings', 'Hash map', 'Sorting'],
    functionName: 'isAnagram',
    tests: [
      { args: ['listen', 'silent'], expected: true },
      { args: ['anagram', 'nagaram'], expected: true },
      { args: ['rat', 'car'], expected: false },
      { args: ['aab', 'abb'], expected: false },
      { args: ['a', 'ab'], expected: false },
      { args: ['', ''], expected: true },
    ],
  },
  {
    id: 'first-unique-char',
    title: 'First non-repeating character',
    difficulty: 'Easy',
    topics: ['Strings', 'Hash map', 'Counting'],
    functionName: 'firstUniqueChar',
    tests: [
      { args: ['leetcode'], expected: 'l' },
      { args: ['loveleetcode'], expected: 'v' },
      { args: ['swiss'], expected: 'w' },
      { args: ['aabb'], expected: null },
      { args: ['a'], expected: 'a' },
      { args: [''], expected: null },
    ],
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Arrays', 'Hash map', 'Time complexity'],
    functionName: 'twoSum',
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[1, 5, 9, 14, 20], 29], expected: [2, 4] },
      { args: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    ],
  },
  {
    id: 'valid-parentheses',
    title: 'Valid parentheses',
    difficulty: 'Easy',
    topics: ['Stack', 'Strings'],
    functionName: 'isValid',
    tests: [
      { args: ['()'], expected: true },
      { args: ['()[]{}'], expected: true },
      { args: ['{[]}'], expected: true },
      { args: ['(]'], expected: false },
      { args: ['([)]'], expected: false },
      { args: ['('], expected: false },
      { args: [')'], expected: false },
      { args: [''], expected: true },
    ],
  },
  {
    id: 'flatten-array',
    title: 'Flatten a nested array',
    difficulty: 'Medium',
    topics: ['Arrays', 'Recursion', 'reduce'],
    functionName: 'flatten',
    tests: [
      { args: [[1, [2, 3]]], expected: [1, 2, 3] },
      { args: [[1, [2, [3, [4]], 5]]], expected: [1, 2, 3, 4, 5] },
      { args: [['a', ['b', ['c']]]], expected: ['a', 'b', 'c'] },
      { args: [[[[]]]], expected: [] },
      { args: [[]], expected: [] },
      {
        label: "doesn't use the built-in arr.flat()",
        run: `const original = Array.prototype.flat
Array.prototype.flat = function () { throw new Error('arr.flat() is not allowed here') }
try { return flatten([1, [2, [3]]]) } finally { Array.prototype.flat = original }`,
        expected: [1, 2, 3],
      },
    ],
  },
  {
    id: 'flatten-object',
    title: 'Flatten a nested object',
    difficulty: 'Medium',
    topics: ['Objects', 'Recursion', 'Object.entries'],
    functionName: 'flattenObject',
    tests: [
      { args: [{ a: 1, b: { c: 2, d: { e: 3 } } }], expected: { a: 1, 'b.c': 2, 'b.d.e': 3 } },
      { args: [{ a: { b: { c: { d: { e: 'deep' } } } } }], expected: { 'a.b.c.d.e': 'deep' } },
      {
        args: [{ user: { name: 'Sam', tags: ['js', 'react'] } }],
        expected: { 'user.name': 'Sam', 'user.tags.0': 'js', 'user.tags.1': 'react' },
      },
      { args: [{ a: null, b: { c: null, d: false, e: 0 } }], expected: { a: null, 'b.c': null, 'b.d': false, 'b.e': 0 } },
      { args: [{ a: {}, b: [], c: { d: {} } }], expected: { a: {}, b: [], 'c.d': {} } },
      { args: [{}], expected: {} },
      {
        label: "doesn't change the original object",
        run: `const original = { a: { b: 1 }, list: [1, 2] }
flattenObject(original)
return original`,
        expected: { a: { b: 1 }, list: [1, 2] },
      },
    ],
  },
  {
    id: 'chunk-array',
    title: 'Chunk an array',
    difficulty: 'Easy',
    topics: ['Arrays', 'slice', 'Loops'],
    functionName: 'chunk',
    tests: [
      { args: [[1, 2, 3, 4, 5], 2], expected: [[1, 2], [3, 4], [5]] },
      { args: [[1, 2, 3, 4], 2], expected: [[1, 2], [3, 4]] },
      { args: [['a', 'b', 'c'], 1], expected: [['a'], ['b'], ['c']] },
      { args: [[1, 2], 5], expected: [[1, 2]] },
      { args: [[], 3], expected: [] },
    ],
  },
  {
    id: 'debounce',
    title: 'Implement debounce',
    difficulty: 'Medium',
    topics: ['Closures', 'Timers', 'this'],
    functionName: 'debounce',
    tests: [
      {
        label: '3 quick calls → runs once, with the last value',
        run: `${WAIT}const calls = []
const d = debounce((x) => calls.push(x), 50)
d(1); d(2); d(3)
await wait(120)
return calls`,
        expected: [3],
      },
      {
        label: "doesn't run before the delay",
        run: `${WAIT}const calls = []
const d = debounce((x) => calls.push(x), 80)
d('a')
await wait(30)
return calls`,
        expected: [],
      },
      {
        label: 'calls separated by more than the delay → both run',
        run: `${WAIT}const calls = []
const d = debounce((x) => calls.push(x), 40)
d(1)
await wait(90)
d(2)
await wait(90)
return calls`,
        expected: [1, 2],
      },
      {
        label: 'passes all arguments',
        run: `${WAIT}let received
const d = debounce((a, b) => { received = [a, b] }, 30)
d('x', 'y')
await wait(80)
return received`,
        expected: ['x', 'y'],
      },
      {
        label: 'keeps `this` (used as an object method)',
        run: `${WAIT}const counter = { count: 0, inc: debounce(function () { this.count++ }, 30) }
counter.inc()
await wait(80)
return counter.count`,
        expected: 1,
      },
    ],
  },
  {
    id: 'throttle',
    title: 'Implement throttle',
    difficulty: 'Medium',
    topics: ['Closures', 'Timers', 'this'],
    functionName: 'throttle',
    tests: [
      {
        label: 'first call runs immediately',
        run: `const calls = []
const t = throttle((x) => calls.push(x), 100)
t(1)
return calls`,
        expected: [1],
      },
      {
        label: 'calls during the wait are ignored',
        run: `const calls = []
const t = throttle((x) => calls.push(x), 100)
t(1); t(2); t(3)
return calls`,
        expected: [1],
      },
      {
        label: 'runs again after the wait',
        run: `${WAIT}const calls = []
const t = throttle((x) => calls.push(x), 50)
t(1); t(2)
await wait(90)
t(3)
return calls`,
        expected: [1, 3],
      },
      {
        label: 'passes arguments and keeps `this`',
        run: `const obj = { name: 'Sam', log: throttle(function (greeting) { return (this.result = greeting + ' ' + this.name) }, 50) }
obj.log('Hi')
return obj.result`,
        expected: 'Hi Sam',
      },
    ],
  },
  {
    id: 'memoize',
    title: 'Implement memoize',
    difficulty: 'Medium',
    topics: ['Closures', 'Caching', 'Map'],
    functionName: 'memoize',
    tests: [
      {
        label: 'returns the right result',
        run: `const square = memoize((n) => n * n)
return [square(4), square(5)]`,
        expected: [16, 25],
      },
      {
        label: 'same argument → fn runs only once',
        run: `let calls = 0
const square = memoize((n) => { calls++; return n * n })
square(4); square(4); square(4)
return calls`,
        expected: 1,
      },
      {
        label: 'works with several arguments',
        run: `let calls = 0
const add = memoize((a, b) => { calls++; return a + b })
const results = [add(1, 2), add(1, 2), add(2, 1)]
return [results, calls]`,
        expected: [[3, 3, 3], 2],
      },
      {
        label: 'caches falsy results like 0',
        run: `let calls = 0
const zero = memoize((n) => { calls++; return n * 0 })
zero(7); zero(7)
return calls`,
        expected: 1,
      },
    ],
  },
  {
    id: 'curry',
    title: 'Implement curry',
    difficulty: 'Medium',
    topics: ['Closures', 'Recursion', 'Functional programming'],
    functionName: 'curry',
    tests: [
      { label: 'curried(1)(2)(3)', run: 'return curry((a, b, c) => a + b + c)(1)(2)(3)', expected: 6 },
      { label: 'curried(1, 2)(3)', run: 'return curry((a, b, c) => a + b + c)(1, 2)(3)', expected: 6 },
      { label: 'curried(1)(2, 3)', run: 'return curry((a, b, c) => a + b + c)(1)(2, 3)', expected: 6 },
      { label: 'curried(1, 2, 3)', run: 'return curry((a, b, c) => a + b + c)(1, 2, 3)', expected: 6 },
      {
        label: 'partial calls can be reused',
        run: `const greet = curry((greeting, name) => greeting + ', ' + name)
const hello = greet('Hello')
return [hello('Sam'), hello('Priya')]`,
        expected: ['Hello, Sam', 'Hello, Priya'],
      },
    ],
  },
  {
    id: 'deep-clone',
    title: 'Implement deep clone',
    difficulty: 'Medium',
    topics: ['Objects', 'Recursion', 'References'],
    functionName: 'deepClone',
    tests: [
      { args: [42], expected: 42 },
      { args: [null], expected: null },
      { args: [{ a: 1, b: { c: [1, 2, { d: 3 }] } }], expected: { a: 1, b: { c: [1, 2, { d: 3 }] } } },
      {
        label: 'changing a nested object in the copy keeps the original',
        run: `const original = { name: 'Sam', address: { city: 'Kochi' } }
const copy = deepClone(original)
copy.address.city = 'Delhi'
return [original.address.city, copy.address.city]`,
        expected: ['Kochi', 'Delhi'],
      },
      {
        label: 'nested arrays are copied too',
        run: `const original = { tags: ['a', 'b'], matrix: [[1], [2]] }
const copy = deepClone(original)
copy.tags.push('c')
copy.matrix[0].push(99)
return [original.tags, original.matrix]`,
        expected: [['a', 'b'], [[1], [2]]],
      },
      {
        label: 'the copy is a different object at every level',
        run: `const original = { a: { b: { c: {} } }, list: [{}] }
const copy = deepClone(original)
return [copy === original, copy.a === original.a, copy.a.b.c === original.a.b.c, copy.list[0] === original.list[0]]`,
        expected: [false, false, false, false],
      },
    ],
  },
  {
    id: 'promise-all',
    title: 'Implement Promise.all',
    difficulty: 'Medium',
    topics: ['Promises', 'Async', 'Event loop'],
    functionName: 'promiseAll',
    tests: [
      {
        label: 'resolves with all results',
        run: 'return await promiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])',
        expected: [1, 2, 3],
      },
      {
        label: 'keeps input order when promises finish out of order',
        run: `const later = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms))
return await promiseAll([later(40, 'a'), later(10, 'b'), later(25, 'c')])`,
        expected: ['a', 'b', 'c'],
      },
      {
        label: 'plain values count as resolved',
        run: 'return await promiseAll([1, Promise.resolve(2), 3])',
        expected: [1, 2, 3],
      },
      { label: 'empty array → []', run: 'return await promiseAll([])', expected: [] },
      {
        label: 'rejects with the first error',
        run: `const later = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms))
try {
  await promiseAll([later(20, 1), Promise.reject(new Error('boom')), later(10, 3)])
  return 'resolved'
} catch (error) {
  return 'rejected: ' + error.message
}`,
        expected: 'rejected: boom',
      },
      {
        label: 'returns a promise',
        run: 'const result = promiseAll([1]); return result instanceof Promise',
        expected: true,
      },
    ],
  },
  {
    id: 'event-emitter',
    title: 'Implement an event emitter',
    difficulty: 'Medium',
    topics: ['Classes', 'Pub/sub', 'Closures'],
    functionName: 'EventEmitter',
    tests: [
      {
        label: 'on + emit calls the listener with arguments',
        run: `const e = new EventEmitter()
const log = []
e.on('greet', (name) => log.push('Hello ' + name))
e.emit('greet', 'Sam')
return log`,
        expected: ['Hello Sam'],
      },
      {
        label: 'several listeners run in order, with several arguments',
        run: `const e = new EventEmitter()
const log = []
e.on('sum', (a, b) => log.push('first ' + (a + b)))
e.on('sum', (a, b) => log.push('second ' + (a * b)))
e.emit('sum', 2, 3)
return log`,
        expected: ['first 5', 'second 6'],
      },
      {
        label: 'off removes a listener',
        run: `const e = new EventEmitter()
const log = []
const listener = () => log.push('called')
e.on('x', listener)
e.off('x', listener)
e.emit('x')
return log`,
        expected: [],
      },
      {
        label: 'emit returns true only if there were listeners',
        run: `const e = new EventEmitter()
const before = e.emit('x')
e.on('x', () => {})
return [before, e.emit('x')]`,
        expected: [false, true],
      },
      {
        label: 'once runs only the first time',
        run: `const e = new EventEmitter()
const log = []
e.once('ready', (n) => log.push(n))
e.emit('ready', 1)
e.emit('ready', 2)
return log`,
        expected: [1],
      },
      {
        label: "a once listener doesn't make the next listener get skipped",
        run: `const e = new EventEmitter()
const log = []
e.once('x', () => log.push('once'))
e.on('x', () => log.push('always'))
e.emit('x')
e.emit('x')
return log`,
        expected: ['once', 'always', 'always'],
      },
    ],
  },
]

for (const problem of coding) {
  problem.category ??= 'react-js'
  problem.content = markdown[`../coding/${problem.id}.md`]
  problem.starter = starters[`../coding/${problem.id}.starter.js`]
  const [problemPart, solutionPart = ''] = problem.content.split(SOLUTION_MARKER)
  problem.problem = problemPart
  problem.solution = solutionPart
  problem.problemSections = getSections(problemPart)
  problem.solutionSections = getSections(solutionPart)
  problem.sections = [...problem.problemSections, ...problem.solutionSections] // used by search
}

export default coding
