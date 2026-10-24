// The TypeScript checker behind the TS coding problems (used by tsWorker.js).
// createChecker(ts, files) → check({ code, tsx, typeTests }) → { typeErrors, typeResults, anyLines, js }
//   files       → { '/node_modules/typescript/lib/lib.es5.d.ts': '...text...', ... }
//   typeErrors  → errors inside the user's own code, as "Line 3: ..." strings
//   typeResults → one { pass, output } per type test
//   anyLines    → lines of the user's code that still use `any`
//   js          → the code with the types stripped, ready for the JS runner
//
// Type tests are snippets added after the user's code, e.g.
//   type T = Expect<Equal<MyPartial<User>, { name?: string }>>
//   // @ts-expect-error   ← passes only if the next line IS a type error
// Each test goes in its own { } block (so tests can reuse names) and passes
// when no error lands on its lines.

const LIB_DIR = '/node_modules/typescript/lib/'

// helpers every type test can use (from the type-challenges project)
const PRELUDE = `type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
type Expect<T extends true> = T`

// turn the compiler's wording into something a learner can act on
function explain(message) {
  if (message.includes("does not satisfy the constraint 'true'")) return "The types don't match the expected type yet."
  if (message.includes("Unused '@ts-expect-error' directive")) return 'This should be a type error, but TypeScript accepted it. Make your types stricter.'
  return message
}

export function createChecker(ts, files) {
  const options = {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    moduleDetection: ts.ModuleDetectionKind.Force, // always a module: no clashes with DOM globals like `name`
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
    noEmit: true,
    skipLibCheck: true,
  }

  // lib files never change, so parse them once and reuse them on every run
  const libCache = new Map()
  const dirs = new Set()
  for (const name of Object.keys(files)) {
    const parts = name.split('/')
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/') || '/')
  }

  function program(fileName, text) {
    const host = {
      getSourceFile(name, languageVersion) {
        if (name === fileName) return ts.createSourceFile(name, text, languageVersion, true)
        if (!(name in files)) return undefined
        if (!libCache.has(name)) libCache.set(name, ts.createSourceFile(name, files[name], languageVersion, true))
        return libCache.get(name)
      },
      getDefaultLibFileName: () => LIB_DIR + 'lib.d.ts',
      getDefaultLibLocation: () => LIB_DIR,
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (name) => name === fileName || name in files,
      readFile: (name) => (name === fileName ? text : files[name]),
      directoryExists: (dir) => dirs.has(dir.replace(/\/$/, '') || '/'),
      getDirectories: () => [],
    }
    return ts.createProgram([fileName], options, host)
  }

  function stripTypes(code, tsx) {
    // CommonJS output keeps `export function foo` usable as a plain `foo`
    const { outputText } = ts.transpileModule(code, {
      fileName: tsx ? 'main.tsx' : 'main.ts',
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    })
    return 'var exports = {}, module = { exports };\n' + outputText
  }

  return function check({ code, tsx = false, typeTests = [] }) {
    // user code, then the helpers, then each test on its own lines (remember where each starts)
    const parts = [code, PRELUDE, ...typeTests.map((t) => `{
${t.code}
}`)]
    const starts = []
    let line = 0
    for (const part of parts) {
      starts.push(line)
      line += part.split('\n').length
    }
    const fileName = tsx ? '/main.tsx' : '/main.ts'
    const prog = program(fileName, parts.join('\n'))
    const source = prog.getSourceFile(fileName)
    const diagnostics = [...prog.getSyntacticDiagnostics(source), ...prog.getSemanticDiagnostics(source)]

    const typeErrors = []
    const testErrors = typeTests.map(() => [])
    for (const d of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(d.messageText, '\n')
      const at = d.start !== undefined ? source.getLineAndCharacterOfPosition(d.start).line : 0
      // which test owns this line? (the last one starting at or before it)
      let test = -1
      for (let i = 0; i < typeTests.length; i++) if (starts[i + 2] <= at) test = i
      if (test >= 0) testErrors[test].push(explain(message))
      else typeErrors.push(`Line ${at + 1}: ${message}`)
    }

    const anyLines = []
    const visit = (node) => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const at = source.getLineAndCharacterOfPosition(node.getStart(source)).line
        if (at < starts[1] && !anyLines.includes(at + 1)) anyLines.push(at + 1)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)

    const typeResults = testErrors.map((errors) => (errors.length ? { pass: false, output: errors[0] } : { pass: true }))
    return { typeErrors, typeResults, anyLines, js: stripTypes(code, tsx) }
  }
}
