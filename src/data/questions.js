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
import packageJsonProd from '../questions/package-json-production.md?raw'
import buildTools from '../questions/build-tools-babel-webpack-vite.md?raw'
import nodeHowItWorks from '../questions/node-how-it-works.md?raw'
import nodeNextTick from '../questions/node-nexttick-process.md?raw'
import nodeThreadPool from '../questions/node-thread-pool-blocking.md?raw'
import nodeStreams from '../questions/node-streams-backpressure.md?raw'
import nodeEventEmitter from '../questions/node-event-emitter.md?raw'
import nodeModules from '../questions/node-modules.md?raw'
import nodeErrors from '../questions/node-error-handling.md?raw'
import nodeMiddleware from '../questions/node-express-middleware.md?raw'
import nodeCluster from '../questions/node-cluster.md?raw'
import nodeWorkers from '../questions/node-worker-threads-child-process.md?raw'
import nodePm2 from '../questions/node-pm2.md?raw'
import nodeMemoryLeaks from '../questions/node-memory-leaks.md?raw'
import nodeShutdown from '../questions/node-graceful-shutdown.md?raw'
import nodeNpm from '../questions/node-npm-package.md?raw'
import nodeSecurity from '../questions/node-security.md?raw'
import htmlSemantic from '../questions/html-semantic.md?raw'
import htmlBlockInline from '../questions/html-block-inline.md?raw'
import htmlAsyncDefer from '../questions/html-async-defer.md?raw'
import htmlA11y from '../questions/html-accessibility.md?raw'
import cssBoxModel from '../questions/css-box-model.md?raw'
import cssSpecificity from '../questions/css-specificity.md?raw'
import cssPositioning from '../questions/css-positioning.md?raw'
import cssFlexbox from '../questions/css-flexbox.md?raw'
import cssGrid from '../questions/css-grid.md?raw'
import cssResponsive from '../questions/css-responsive-units.md?raw'
import cssPseudo from '../questions/css-pseudo.md?raw'
import cssHiding from '../questions/css-hiding.md?raw'
import cssVariables from '../questions/css-variables.md?raw'
import cssReflow from '../questions/css-reflow-repaint.md?raw'
import playwrightE2e from '../questions/playwright-e2e.md?raw'
import promiseCombinators from '../questions/promise-combinators.md?raw'
import promisesAsyncAwait from '../questions/promises-async-await.md?raw'
import closuresHoisting from '../questions/closures-hoisting.md?raw'
import browserStorage from '../questions/browser-storage-cookies.md?raw'
import sdJd from '../questions/sd-fe-jd-decoded.md?raw'
import sdFramework from '../questions/sd-fe-interview-framework.md?raw'
import sdArchitecture from '../questions/sd-fe-architecture.md?raw'
import sdNext from '../questions/sd-fe-nextjs-rendering.md?raw'
import sdHeadless from '../questions/sd-fe-headless-commerce.md?raw'
import sdPatterns from '../questions/sd-fe-react-patterns.md?raw'
import sdRequirements from '../questions/sd-fe-requirements-to-code.md?raw'
import sdStandards from '../questions/sd-fe-coding-standards.md?raw'
import sdPerformance from '../questions/sd-fe-performance-cwv.md?raw'
import sdA11y from '../questions/sd-fe-accessibility.md?raw'
import sdCollab from '../questions/sd-fe-collaboration-devops.md?raw'
import sdLeadership from '../questions/sd-fe-mentoring-leadership.md?raw'
import sdEcommerce from '../questions/sd-fe-design-ecommerce.md?raw'
import sdFastify from '../questions/sd-be-fastify.md?raw'
import faReactRedux from '../questions/fa-react-redux-architecture.md?raw'

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
  {
    id: 'package-json-production',
    title: 'package.json in a production React app',
    content: packageJsonProd,
  },
  {
    id: 'build-tools-babel-webpack-vite',
    title: 'Babel, Webpack & why Vite came',
    content: buildTools,
  },
  {
    id: 'playwright-e2e',
    title: 'Playwright end-to-end testing',
    content: playwrightE2e,
  },
  {
    id: 'promise-combinators',
    title: 'Calling multiple APIs: Promise.all, allSettled, race & any',
    content: promiseCombinators,
  },
  {
    id: 'promises-async-await',
    title: 'Promises in depth: states, then/catch, async/await & HTTP status handling',
    content: promisesAsyncAwait,
  },
  {
    id: 'closures-hoisting',
    title: 'Closures & hoisting (TDZ, let/const, function declarations vs arrows)',
    content: closuresHoisting,
  },
  {
    id: 'browser-storage-cookies',
    title: 'localStorage vs sessionStorage vs cookies (HttpOnly)',
    content: browserStorage,
  },
  {
    id: 'node-how-it-works',
    title: 'How Node.js works (V8, libuv, non-blocking I/O)',
    category: 'node',
    content: nodeHowItWorks,
  },
  {
    id: 'event-loop-node',
    title: 'Node.js event loop phases (timers, poll, check)',
    category: 'node',
    content: eventLoopNode,
  },
  {
    id: 'node-nexttick-process',
    title: 'process.nextTick vs setImmediate & the process object',
    category: 'node',
    content: nodeNextTick,
  },
  {
    id: 'node-thread-pool-blocking',
    title: 'libuv thread pool & blocking the event loop',
    category: 'node',
    content: nodeThreadPool,
  },
  {
    id: 'node-streams-backpressure',
    title: 'Streams & backpressure',
    category: 'node',
    content: nodeStreams,
  },
  {
    id: 'node-event-emitter',
    title: 'EventEmitter in Node.js',
    category: 'node',
    content: nodeEventEmitter,
  },
  {
    id: 'node-modules',
    title: 'CommonJS vs ES modules',
    category: 'node',
    content: nodeModules,
  },
  {
    id: 'node-error-handling',
    title: 'Error handling in Node.js',
    category: 'node',
    content: nodeErrors,
  },
  {
    id: 'node-express-middleware',
    title: 'Express middleware',
    category: 'node',
    content: nodeMiddleware,
  },
  {
    id: 'node-cluster',
    title: 'Cluster module (using all CPU cores)',
    category: 'node',
    content: nodeCluster,
  },
  {
    id: 'node-worker-threads-child-process',
    title: 'Worker threads vs child processes vs cluster',
    category: 'node',
    content: nodeWorkers,
  },
  {
    id: 'node-pm2',
    title: 'PM2 process manager',
    category: 'node',
    content: nodePm2,
  },
  {
    id: 'node-memory-leaks',
    title: 'Memory leaks: causes & debugging',
    category: 'node',
    content: nodeMemoryLeaks,
  },
  {
    id: 'node-graceful-shutdown',
    title: 'Graceful shutdown (SIGTERM)',
    category: 'node',
    content: nodeShutdown,
  },
  {
    id: 'node-npm-package',
    title: 'npm, package.json & semver',
    category: 'node',
    content: nodeNpm,
  },
  {
    id: 'node-security',
    title: 'Node.js API security best practices',
    category: 'node',
    content: nodeSecurity,
  },
  {
    id: 'html-semantic',
    title: 'Semantic HTML & HTML5 features',
    category: 'html-css',
    content: htmlSemantic,
  },
  {
    id: 'html-block-inline',
    title: 'Block vs inline vs inline-block',
    category: 'html-css',
    content: htmlBlockInline,
  },
  {
    id: 'html-async-defer',
    title: 'Script loading: async vs defer',
    category: 'html-css',
    content: htmlAsyncDefer,
  },
  {
    id: 'html-accessibility',
    title: 'Accessibility (a11y) basics',
    category: 'html-css',
    content: htmlA11y,
  },
  {
    id: 'css-box-model',
    title: 'CSS box model, box-sizing & margin collapse',
    category: 'html-css',
    content: cssBoxModel,
  },
  {
    id: 'css-specificity',
    title: 'Specificity, cascade & inheritance',
    category: 'html-css',
    content: cssSpecificity,
  },
  {
    id: 'css-positioning',
    title: 'Positioning & z-index (stacking context)',
    category: 'html-css',
    content: cssPositioning,
  },
  {
    id: 'css-flexbox',
    title: 'Flexbox',
    category: 'html-css',
    content: cssFlexbox,
  },
  {
    id: 'css-grid',
    title: 'CSS Grid (and Grid vs Flexbox)',
    category: 'html-css',
    content: cssGrid,
  },
  {
    id: 'css-responsive-units',
    title: 'Responsive design & CSS units (rem, em, vw)',
    category: 'html-css',
    content: cssResponsive,
  },
  {
    id: 'css-pseudo',
    title: 'Pseudo-classes vs pseudo-elements',
    category: 'html-css',
    content: cssPseudo,
  },
  {
    id: 'css-hiding',
    title: 'display: none vs visibility: hidden vs opacity: 0',
    category: 'html-css',
    content: cssHiding,
  },
  {
    id: 'css-variables',
    title: 'CSS variables (custom properties) & theming',
    category: 'html-css',
    content: cssVariables,
  },
  {
    id: 'css-reflow-repaint',
    title: 'Reflow, repaint & animation performance',
    category: 'html-css',
    content: cssReflow,
  },
  {
    id: 'sd-fe-jd-decoded',
    title: "React Architect JD decoded: expectations & study plan",
    category: 'system-design',
    section: 'frontend',
    content: sdJd,
  },
  {
    id: 'sd-fe-interview-framework',
    title: "How to answer a frontend system design interview (RADIO)",
    category: 'system-design',
    section: 'frontend',
    content: sdFramework,
  },
  {
    id: 'sd-fe-architecture',
    title: "Leading & defining frontend architecture",
    category: 'system-design',
    section: 'frontend',
    content: sdArchitecture,
  },
  {
    id: 'sd-fe-nextjs-rendering',
    title: "Next.js rendering strategies, server components & caching",
    category: 'system-design',
    section: 'frontend',
    content: sdNext,
  },
  {
    id: 'sd-fe-headless-commerce',
    title: "Headless e-commerce & API integration (BFF)",
    category: 'system-design',
    section: 'frontend',
    content: sdHeadless,
  },
  {
    id: 'sd-fe-react-patterns',
    title: "Modern React patterns for scalable UI",
    category: 'system-design',
    section: 'frontend',
    content: sdPatterns,
  },
  {
    id: 'sd-fe-requirements-to-code',
    title: "Turning business & UX requirements into code",
    category: 'system-design',
    section: 'frontend',
    content: sdRequirements,
  },
  {
    id: 'sd-fe-coding-standards',
    title: "Coding standards, best practices & code reviews",
    category: 'system-design',
    section: 'frontend',
    content: sdStandards,
  },
  {
    id: 'sd-fe-performance-cwv',
    title: "Performance, scalability & Core Web Vitals",
    category: 'system-design',
    section: 'frontend',
    content: sdPerformance,
  },
  {
    id: 'sd-fe-accessibility',
    title: "Accessibility at scale (WCAG 2.2, EAA)",
    category: 'system-design',
    section: 'frontend',
    content: sdA11y,
  },
  {
    id: 'sd-fe-collaboration-devops',
    title: "Working with backend, UX & DevOps (CI/CD)",
    category: 'system-design',
    section: 'frontend',
    content: sdCollab,
  },
  {
    id: 'sd-fe-mentoring-leadership',
    title: "Mentoring & technical leadership",
    category: 'system-design',
    section: 'frontend',
    content: sdLeadership,
  },
  {
    id: 'sd-fe-design-ecommerce',
    title: "Worked example: design a headless e-commerce storefront",
    category: 'system-design',
    section: 'frontend',
    content: sdEcommerce,
  },
  {
    id: 'sd-be-fastify',
    title: "Node.js services with Fastify (performance & scalability)",
    category: 'system-design',
    section: 'backend',
    content: sdFastify,
  },
  {
    id: 'fa-react-redux-architecture',
    title: 'Production React + Redux architecture & folder structure',
    category: 'frontend-architecture',
    content: faReactRedux,
  },
]

for (const q of questions) {
  q.category ??= 'react-js'
  q.sections = getSections(q.content)
}

export default questions
