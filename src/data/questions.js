// To add a question: create a .md file in src/questions and add an entry here.
// Tags are made automatically from the answer's '## ' section headings.
// category: an id from categories.js (defaults to 'react-js').
import { getSections } from '../utils/sections.js'
import useStateVsUseRef from '../questions/usestate-vs-useref.md?raw'
import liftingStateUp from '../questions/lifting-state-up.md?raw'
import virtualDom from '../questions/virtual-dom.md?raw'
import diffingComplexity from '../questions/diffing-complexity.md?raw'
import reactFiber from '../questions/react-fiber.md?raw'
import reRenderCauses from '../questions/re-render-causes.md?raw'
import memoUseCallback from '../questions/memo-usecallback.md?raw'
import reactCompiler from '../questions/react-compiler.md?raw'
import spreadRest from '../questions/spread-rest.md?raw'
import strictMode from '../questions/strict-mode.md?raw'
import react18And19 from '../questions/react-18-19.md?raw'
import typeCoercion from '../questions/type-coercion.md?raw'
import thisKeyword from '../questions/this-keyword.md?raw'
import eventLoopBrowser from '../questions/event-loop-browser.md?raw'
import eventLoopNode from '../questions/event-loop-node.md?raw'
import mapFilterReduce from '../questions/map-filter-reduce.md?raw'
import xssCsrf from '../questions/xss-csrf.md?raw'

const questions = [
  {
    id: 'usestate-vs-useref',
    title: 'useState vs useRef (Timer example)',
    content: useStateVsUseRef,
  },
  {
    id: 'lifting-state-up',
    title: 'Parent ↔ child data flow (Lifting state up)',
    content: liftingStateUp,
  },
  {
    id: 'virtual-dom',
    title: 'Virtual DOM & Reconciliation',
    content: virtualDom,
  },
  {
    id: 'diffing-complexity',
    title: 'Why is tree diffing O(n³)?',
    content: diffingComplexity,
  },
  {
    id: 'react-fiber',
    title: 'React Fiber',
    content: reactFiber,
  },
  {
    id: 're-render-causes',
    title: 'What causes a component to re-render?',
    content: reRenderCauses,
  },
  {
    id: 'memo-usecallback',
    title: 'React.memo + useCallback',
    content: memoUseCallback,
  },
  {
    id: 'react-compiler',
    title: 'React Compiler',
    content: reactCompiler,
  },
  {
    id: 'spread-rest',
    title: 'Spread & Rest operators',
    content: spreadRest,
  },
  {
    id: 'strict-mode',
    title: 'React StrictMode',
    content: strictMode,
  },
  {
    id: 'react-18-19',
    title: 'React 18 & 19 features',
    content: react18And19,
  },
  {
    id: 'type-coercion',
    title: 'Type coercion (== vs ===, truthy & falsy)',
    content: typeCoercion,
  },
  {
    id: 'this-keyword',
    title: 'The this keyword',
    content: thisKeyword,
  },
  {
    id: 'event-loop-browser',
    title: 'JavaScript event loop (browser): macro & micro tasks',
    content: eventLoopBrowser,
  },
  {
    id: 'event-loop-node',
    title: 'Node.js event loop phases (timers, poll, check)',
    content: eventLoopNode,
  },
  {
    id: 'map-filter-reduce',
    title: 'map, filter & reduce',
    content: mapFilterReduce,
  },
  {
    id: 'xss-csrf',
    title: 'XSS, CSRF & DOMPurify (with real-world attacks)',
    content: xssCsrf,
  },
]

for (const q of questions) {
  q.category ??= 'react-js'
  q.sections = getSections(q.content)
}

export default questions
