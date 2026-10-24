// Type-checks TypeScript in a Web Worker with the real compiler (TypeScript 6).
// Posts { type: 'ready' } once loaded, then receives { id, code, tsx, typeTests }
// and posts back { id, typeErrors, typeResults, js } (see tsCheck.js).
import ts from 'typescript'
import { createChecker } from './tsCheck.js'

// the type definitions the checker needs: ES2023 + DOM, and React's types for .tsx
const libFiles = import.meta.glob(
  [
    '/node_modules/typescript/lib/lib.es5.d.ts',
    '/node_modules/typescript/lib/lib.es20{15,16,17,18,19,20,21,22,23}*.d.ts',
    '/node_modules/typescript/lib/lib.decorators*.d.ts',
    '/node_modules/typescript/lib/lib.dom.d.ts',
    '/node_modules/typescript/lib/lib.dom.iterable.d.ts',
    '!/node_modules/typescript/lib/lib.*.full.d.ts',
  ],
  { query: '?raw', import: 'default', eager: true }
)
const typeFiles = import.meta.glob(
  [
    '/node_modules/@types/react/{index,global,jsx-runtime,jsx-dev-runtime}.d.ts',
    '/node_modules/@types/react/package.json',
    '/node_modules/csstype/index.d.ts',
    '/node_modules/csstype/package.json',
  ],
  { query: '?raw', import: 'default', eager: true }
)
const checker = createChecker(ts, { ...libFiles, ...typeFiles })

self.onmessage = (event) => {
  const { id, ...input } = event.data
  try {
    self.postMessage({ id, ...checker(input) })
  } catch (error) {
    self.postMessage({ id, error: `TypeScript checker crashed: ${error?.message ?? error}` })
  }
}

self.postMessage({ type: 'ready' })
