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
import customHooks from '../questions/custom-hooks.md?raw'
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
import authFlow from '../questions/auth-flow.md?raw'
import jsxKeys from '../questions/jsx-keys.md?raw'
import stateProps from '../questions/state-props.md?raw'
import useStateUseEffect from '../questions/usestate-useeffect.md?raw'
import classVsFunction from '../questions/class-vs-function.md?raw'
import childStateRefs from '../questions/child-state-refs.md?raw'
import bigLists from '../questions/big-lists.md?raw'
import redux from '../questions/redux.md?raw'
import reactRouter from '../questions/react-router.md?raw'
import useLocationQ from '../questions/uselocation.md?raw'

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
    id: 'custom-hooks',
    title: 'Custom hooks: useWindowSize, useDebounce & more (step by step)',
    content: customHooks,
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
  {
    id: 'auth-flow',
    title: 'Auth flow: protected routes, axios interceptors & refresh tokens',
    content: authFlow,
  },
  {
    id: 'jsx-keys',
    title: 'JSX & keys (why keys matter for performance)',
    content: jsxKeys,
  },
  {
    id: 'state-props',
    title: 'State vs props, controlled vs uncontrolled, prop drilling',
    content: stateProps,
  },
  {
    id: 'usestate-useeffect',
    title: 'useState & useEffect must-knows (how cleanup works)',
    content: useStateUseEffect,
  },
  {
    id: 'class-vs-function',
    title: 'Class vs function components (lifecycle vs hooks)',
    content: classVsFunction,
  },
  {
    id: 'child-state-refs',
    title: 'Accessing child state: useRef & useImperativeHandle',
    content: childStateRefs,
  },
  {
    id: 'big-lists',
    title: 'Big lists: infinite scroll & virtualization',
    content: bigLists,
  },
  {
    id: 'redux',
    title: 'Redux & Redux Toolkit (step by step)',
    content: redux,
  },
  {
    id: 'react-router',
    title: 'React Router: how it works',
    content: reactRouter,
  },
  {
    id: 'uselocation',
    title: 'useLocation: query params & navigation state',
    content: useLocationQ,
  },
]

for (const q of questions) {
  q.category ??= 'react-js'
  q.sections = getSections(q.content)
}

export default questions
