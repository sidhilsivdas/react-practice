// TypeScript coding problems (category 'typescript'), easiest first.
// Each one has src/coding/<id>.md + <id>.starter.ts (or .starter.tsx for React).
//   typeTests → { label, code }: code is checked after the user's code, in its own block.
//               Use Expect<Equal<A, B>>, or a `// @ts-expect-error` line before code that must NOT compile.
//   tests     → JS tests, same as the JS problems (they run on the type-stripped code)
//   noAny     → adds a "No `any` left in your code" test
const WAIT = 'const wait = (ms) => new Promise((r) => setTimeout(r, ms))\n'

const codingTs = [
  // ───────── Easy ─────────
  {
    id: 'ts-basic-annotations',
    title: 'Add types to a function and an object',
    difficulty: 'Easy',
    topics: ['Type annotations', 'Object types', 'Optional', 'Literal unions'],
    functionName: 'greet',
    noAny: true,
    typeTests: [
      {
        label: 'User has id, name, an optional email and a role',
        code: `type T = Expect<Equal<User, { id: number; name: string; email?: string; role: 'admin' | 'member' }>>`,
      },
      {
        label: "role only allows 'admin' or 'member'",
        code: `// @ts-expect-error
const bad: User = { id: 1, name: 'Ana', role: 'owner' }`,
      },
      {
        label: 'greet takes a User and an optional string',
        code: `type T = Expect<Equal<Parameters<typeof greet>, [user: User, greeting?: string]>>`,
      },
      {
        label: 'greet returns a string',
        code: `type T = Expect<Equal<ReturnType<typeof greet>, string>>`,
      },
      {
        label: 'greet(42) is a type error',
        code: `// @ts-expect-error
greet(42)`,
      },
    ],
    tests: [
      { args: [{ id: 1, name: 'Ana', role: 'admin' }], expected: 'Hello, Ana!' },
      { args: [{ id: 2, name: 'Bo', role: 'member' }, 'Hi'], expected: 'Hi, Bo!' },
    ],
  },
  {
    id: 'ts-union-narrowing',
    title: 'Narrow a union type (typeof, Array.isArray, in)',
    difficulty: 'Easy',
    topics: ['Unions', 'Narrowing', 'typeof', 'in operator'],
    functionName: 'toDisplay',
    typeTests: [
      {
        label: 'toDisplay keeps its type: (value: Input) => string',
        code: `type T = Expect<Equal<typeof toDisplay, (value: Input) => string>>`,
      },
      {
        label: 'speak keeps its type: (pet: Cat | Dog) => string',
        code: `type T = Expect<Equal<typeof speak, (pet: Cat | Dog) => string>>`,
      },
    ],
    tests: [
      { args: [3.14159], expected: '3.14' },
      { args: [10], expected: '10.00' },
      { args: ['  hi  '], expected: 'hi' },
      { args: [['a', 'b', 'c']], expected: 'a, b, c' },
      { args: [null], expected: '—' },
    ],
  },
  {
    id: 'ts-as-const',
    title: 'Literal types, as const & typeof',
    difficulty: 'Easy',
    topics: ['as const', 'Literal types', 'typeof', 'Indexed access'],
    functionName: 'getLabel',
    typeTests: [
      {
        label: 'ROLES is a readonly tuple of literals',
        code: `type T = Expect<Equal<typeof ROLES, readonly ['admin', 'editor', 'viewer']>>`,
      },
      {
        label: 'Role is derived from ROLES',
        code: `type T = Expect<Equal<Role, 'admin' | 'editor' | 'viewer'>>`,
      },
      {
        label: 'getLabel takes a Role',
        code: `type T = Expect<Equal<Parameters<typeof getLabel>, [role: Role]>>`,
      },
      {
        label: "getLabel('owner') is a type error",
        code: `// @ts-expect-error
getLabel('owner')`,
      },
      {
        label: 'LABELS has a label for every Role',
        code: `type T = Expect<Equal<keyof typeof LABELS, Role>>`,
      },
    ],
    tests: [
      { args: ['admin'], expected: 'Administrator' },
      { args: ['viewer'], expected: 'Viewer' },
    ],
  },
  {
    id: 'ts-react-props',
    title: "Type a React component's props",
    difficulty: 'Easy',
    topics: ['React', 'Props', 'ReactNode', 'Optional props'],
    noAny: true,
    typeTests: [
      { label: '<Button>Save</Button> works', code: `const el = <Button>Save</Button>` },
      {
        label: 'variant, size and onClick are allowed',
        code: `const el = <Button variant="secondary" size="lg" onClick={() => console.log('hi')}>Go</Button>`,
      },
      {
        label: 'variant="danger" is a type error',
        code: `// @ts-expect-error
const el = <Button variant="danger">X</Button>`,
      },
      {
        label: 'size="xl" is a type error',
        code: `// @ts-expect-error
const el = <Button size="xl">X</Button>`,
      },
      {
        label: 'children are required',
        code: `// @ts-expect-error
const el = <Button />`,
      },
      {
        label: 'onClick must be a function',
        code: `// @ts-expect-error
const el = <Button onClick="save">X</Button>`,
      },
    ],
  },
  {
    id: 'ts-react-state-events',
    title: 'Type useState and event handlers in React',
    difficulty: 'Easy',
    topics: ['React', 'useState', 'Events', 'null'],
    noAny: true,
    typeTests: [
      { label: '<TodoApp /> works', code: `const el = <TodoApp />` },
    ],
  },

  // ───────── Medium ─────────
  {
    id: 'ts-type-guards',
    title: 'Write type guards (value is T)',
    difficulty: 'Medium',
    topics: ['Type predicates', 'unknown', 'Narrowing', 'filter'],
    functionName: 'isUser',
    noAny: true,
    typeTests: [
      {
        label: '.filter(isDefined) removes null and undefined from the type',
        code: `const ids = [1, null, 2, undefined].filter(isDefined)
type T = Expect<Equal<typeof ids, number[]>>`,
      },
      {
        label: 'isUser narrows unknown to User',
        code: `function check(data: unknown) {
  if (isUser(data)) {
    const name: string = data.name
  }
}`,
      },
      {
        label: 'isUser takes unknown',
        code: `type T = Expect<Equal<Parameters<typeof isUser>, [value: unknown]>>`,
      },
    ],
    tests: [
      { args: [{ id: 1, name: 'Ana' }], expected: true },
      { args: [{ id: '1', name: 'Ana' }], expected: false },
      { args: [{ id: 1 }], expected: false },
      { args: [null], expected: false },
      { args: ['Ana'], expected: false },
      { args: [[1, 'Ana']], expected: false },
    ],
  },
  {
    id: 'ts-discriminated-union',
    title: 'Discriminated unions & exhaustive checks (never)',
    difficulty: 'Medium',
    topics: ['Discriminated unions', 'switch', 'never', 'Exhaustiveness'],
    functionName: 'area',
    noAny: true,
    typeTests: [
      {
        label: "Shape['kind'] is 'circle' | 'square' | 'rect'",
        code: `type T = Expect<Equal<Shape['kind'], 'circle' | 'square' | 'rect'>>`,
      },
      {
        label: 'a circle needs a radius (not a size)',
        code: `// @ts-expect-error
const c: Shape = { kind: 'circle', size: 2 }`,
      },
      {
        label: 'checking kind narrows the shape',
        code: `function check(s: Shape) {
  if (s.kind === 'rect') {
    const w: number = s.width
  }
}`,
      },
      {
        label: 'assertNever only accepts never',
        code: `type T = Expect<Equal<Parameters<typeof assertNever>, [value: never]>>
// @ts-expect-error
assertNever('circle')`,
      },
    ],
    tests: [
      { args: [{ kind: 'circle', radius: 1 }], expected: Math.PI },
      { args: [{ kind: 'circle', radius: 2 }], expected: Math.PI * 4 },
      { args: [{ kind: 'square', size: 3 }], expected: 9 },
      { args: [{ kind: 'rect', width: 2, height: 5 }], expected: 10 },
    ],
  },
  {
    id: 'ts-generics-basics',
    title: 'Your first generic functions',
    difficulty: 'Medium',
    topics: ['Generics', 'Inference', 'Constraints', 'extends'],
    functionName: 'first',
    noAny: true,
    typeTests: [
      {
        label: 'first([1, 2, 3]) is number | undefined',
        code: `const n = first([1, 2, 3])
type T = Expect<Equal<typeof n, number | undefined>>`,
      },
      {
        label: "first(['a', 'b']) is string | undefined",
        code: `const s = first(['a', 'b'])
type T = Expect<Equal<typeof s, string | undefined>>`,
      },
      {
        label: "wrap('hi') is string[]",
        code: `const w = wrap('hi')
type T = Expect<Equal<typeof w, string[]>>`,
      },
      {
        label: "merge keeps both objects' property types",
        code: `const m = merge({ id: 1 }, { name: 'Ana' })
type A = Expect<Equal<typeof m.id, number>>
type B = Expect<Equal<typeof m.name, string>>`,
      },
      {
        label: 'merge only accepts objects',
        code: `// @ts-expect-error
merge({ id: 1 }, 'text')`,
      },
    ],
    tests: [
      { args: [[1, 2, 3]], expected: 1 },
      { args: [['a']], expected: 'a' },
      { args: [[]], expected: undefined },
    ],
  },
  {
    id: 'ts-keyof',
    title: 'keyof & indexed access: getProperty and pluck',
    difficulty: 'Medium',
    topics: ['keyof', 'Indexed access T[K]', 'Generics', 'Constraints'],
    functionName: 'pluck',
    noAny: true,
    typeTests: [
      {
        label: "getProperty(user, 'name') is string",
        code: `const user = { id: 1, name: 'Ana', admin: true }
const v = getProperty(user, 'name')
type T = Expect<Equal<typeof v, string>>`,
      },
      {
        label: "getProperty(user, 'admin') is boolean",
        code: `const user = { id: 1, name: 'Ana', admin: true }
const v = getProperty(user, 'admin')
type T = Expect<Equal<typeof v, boolean>>`,
      },
      {
        label: "getProperty(user, 'email') is a type error",
        code: `const user = { id: 1, name: 'Ana', admin: true }
// @ts-expect-error
getProperty(user, 'email')`,
      },
      {
        label: "pluck(users, 'id') is number[]",
        code: `const users = [{ id: 1, name: 'Ana' }]
const ids = pluck(users, 'id')
type T = Expect<Equal<typeof ids, number[]>>`,
      },
      {
        label: "pluck(users, 'age') is a type error",
        code: `const users = [{ id: 1, name: 'Ana' }]
// @ts-expect-error
pluck(users, 'age')`,
      },
    ],
    tests: [
      { args: [[{ id: 1, name: 'Ana' }, { id: 2, name: 'Bo' }], 'name'], expected: ['Ana', 'Bo'] },
      { args: [[{ id: 1, name: 'Ana' }, { id: 2, name: 'Bo' }], 'id'], expected: [1, 2] },
      { args: [[], 'id'], expected: [] },
    ],
  },
  {
    id: 'ts-utility-types',
    title: 'Use the built-in utility types (Partial, Pick, Omit, Record…)',
    difficulty: 'Medium',
    topics: ['Partial', 'Pick', 'Omit', 'Record', 'Parameters'],
    functionName: 'updateUser',
    noAny: true,
    typeTests: [
      {
        label: 'UserUpdate: every field optional, and no id',
        code: `type T = Expect<Equal<UserUpdate, { name?: string; email?: string; password?: string; role?: 'admin' | 'member' }>>`,
      },
      {
        label: 'PublicUser: User without password',
        code: `type T = Expect<Equal<PublicUser, { id: number; name: string; email: string; role: 'admin' | 'member' }>>`,
      },
      {
        label: 'UserPreview: only id and name',
        code: `type T = Expect<Equal<UserPreview, { id: number; name: string }>>`,
      },
      {
        label: 'UsersByRole: a User[] for each role',
        code: `type T = Expect<Equal<UsersByRole, { admin: User[]; member: User[] }>>`,
      },
      {
        label: "UpdateArgs: updateUser's parameters",
        code: `type T = Expect<Equal<UpdateArgs, [user: User, changes: UserUpdate]>>`,
      },
      {
        label: "updateUser(user, { id: 2 }) is a type error",
        code: `const user = {} as User
// @ts-expect-error
updateUser(user, { id: 2 })`,
      },
    ],
    tests: [
      {
        args: [{ id: 1, name: 'Ana', email: 'a@x.com', password: 'pw', role: 'member' }, { name: 'Anna', role: 'admin' }],
        expected: { id: 1, name: 'Anna', email: 'a@x.com', password: 'pw', role: 'admin' },
      },
      {
        args: [{ id: 2, name: 'Bo', email: 'b@x.com', password: 'pw', role: 'member' }, {}],
        expected: { id: 2, name: 'Bo', email: 'b@x.com', password: 'pw', role: 'member' },
      },
    ],
  },
  {
    id: 'ts-typed-reducer',
    title: 'Type a useReducer reducer with an action union',
    difficulty: 'Medium',
    topics: ['React', 'useReducer', 'Discriminated unions', 'Immutability'],
    functionName: 'cartReducer',
    noAny: true,
    typeTests: [
      {
        label: "Action['type'] is 'add' | 'remove' | 'clear'",
        code: `type T = Expect<Equal<Action['type'], 'add' | 'remove' | 'clear'>>`,
      },
      {
        label: "{ type: 'remove' } without an id is a type error",
        code: `// @ts-expect-error
cartReducer({ items: [] }, { type: 'remove' })`,
      },
      {
        label: "{ type: 'reset' } is a type error",
        code: `// @ts-expect-error
cartReducer({ items: [] }, { type: 'reset' })`,
      },
      {
        label: "an 'add' action needs a full CartItem",
        code: `// @ts-expect-error
cartReducer({ items: [] }, { type: 'add', item: { id: 1, name: 'Pen' } })`,
      },
    ],
    tests: [
      {
        args: [{ items: [] }, { type: 'add', item: { id: 1, name: 'Pen', price: 2, qty: 1 } }],
        expected: { items: [{ id: 1, name: 'Pen', price: 2, qty: 1 }] },
      },
      {
        label: "'add' with an id already in the cart adds to its qty",
        run: `return cartReducer({ items: [{ id: 1, name: 'Pen', price: 2, qty: 1 }] }, { type: 'add', item: { id: 1, name: 'Pen', price: 2, qty: 2 } })`,
        expected: { items: [{ id: 1, name: 'Pen', price: 2, qty: 3 }] },
      },
      {
        args: [{ items: [{ id: 1, name: 'Pen', price: 2, qty: 1 }, { id: 2, name: 'Cup', price: 5, qty: 1 }] }, { type: 'remove', id: 1 }],
        expected: { items: [{ id: 2, name: 'Cup', price: 5, qty: 1 }] },
      },
      {
        args: [{ items: [{ id: 1, name: 'Pen', price: 2, qty: 1 }] }, { type: 'clear' }],
        expected: { items: [] },
      },
      {
        label: "doesn't change the old state (returns a new object)",
        run: `const state = { items: [] }
const next = cartReducer(state, { type: 'add', item: { id: 1, name: 'Pen', price: 2, qty: 1 } })
return [state.items.length, next !== state]`,
        expected: [0, true],
      },
    ],
  },
  {
    id: 'ts-react-custom-hooks',
    title: 'Type custom hooks (tuple returns, generic hooks)',
    difficulty: 'Medium',
    topics: ['React', 'Custom hooks', 'Tuples', 'as const', 'Generics'],
    noAny: true,
    typeTests: [
      {
        label: 'useToggle returns [boolean, () => void]',
        code: `function Test() {
  const [on, toggle] = useToggle()
  type A = Expect<Equal<typeof on, boolean>>
  type B = Expect<Equal<typeof toggle, () => void>>
}`,
      },
      {
        label: "useLocalStorage('theme', 'dark') gives a string and a setter for strings",
        code: `function Test() {
  const [theme, setTheme] = useLocalStorage('theme', 'dark')
  type A = Expect<Equal<typeof theme, string>>
  setTheme('light')
  // @ts-expect-error
  setTheme(42)
}`,
      },
      {
        label: 'useLocalStorage works with any type, e.g. number[]',
        code: `function Test() {
  const [ids, setIds] = useLocalStorage('ids', [1, 2])
  type A = Expect<Equal<typeof ids, number[]>>
  setIds([...ids, 3])
}`,
      },
    ],
  },
  {
    id: 'ts-react-native-props',
    title: 'Extend native HTML props & type refs',
    difficulty: 'Medium',
    topics: ['React', 'ComponentProps', 'useRef', 'Rest props'],
    noAny: true,
    typeTests: [
      {
        label: 'TextInput accepts normal <input> props',
        code: `const el = <TextInput label="Email" type="email" placeholder="you@example.com" required />`,
      },
      {
        label: "onChange's event is typed",
        code: `const el = <TextInput label="Name" onChange={(e) => { const v: string = e.target.value }} />`,
      },
      {
        label: 'label is required',
        code: `// @ts-expect-error
const el = <TextInput type="email" />`,
      },
      {
        label: 'type={42} is a type error',
        code: `// @ts-expect-error
const el = <TextInput label="Age" type={42} />`,
      },
      { label: '<SearchBox /> works', code: `const el = <SearchBox />` },
    ],
  },
  {
    id: 'ts-generic-groupby',
    title: 'Write a generic groupBy',
    difficulty: 'Medium',
    topics: ['Generics', 'PropertyKey', 'Record', 'Callbacks'],
    functionName: 'groupBy',
    noAny: true,
    typeTests: [
      {
        label: 'the key callback gets the item type',
        code: `groupBy([{ n: 1 }], (item) => {
  const n: number = item.n
  return 'k'
})`,
      },
      {
        label: 'groups by length → Partial<Record<number, string[]>>',
        code: `const byLength = groupBy(['a', 'bb'], (s) => s.length)
type T = Expect<Equal<typeof byLength, Partial<Record<number, string[]>>>>`,
      },
      {
        label: "keys are a literal union when the callback returns one",
        code: `type User = { name: string; role: 'admin' | 'member' }
const users: User[] = []
const byRole = groupBy(users, (u) => u.role)
type T = Expect<Equal<typeof byRole, Partial<Record<'admin' | 'member', User[]>>>>`,
      },
      {
        label: 'the key must be a string, number or symbol',
        code: `// @ts-expect-error
groupBy([1, 2], (n) => ({ n }))`,
      },
    ],
    tests: [
      {
        label: "groupBy(['one', 'two', 'three'], (s) => s.length)",
        run: `return groupBy(['one', 'two', 'three'], (s) => s.length)`,
        expected: { 3: ['one', 'two'], 5: ['three'] },
      },
      {
        label: 'groupBy(users, (u) => u.role)',
        run: `return groupBy([{ n: 'a', role: 'admin' }, { n: 'b', role: 'member' }, { n: 'c', role: 'admin' }], (u) => u.role)`,
        expected: { admin: [{ n: 'a', role: 'admin' }, { n: 'c', role: 'admin' }], member: [{ n: 'b', role: 'member' }] },
      },
      {
        label: 'groupBy([], ...) → {}',
        run: `return groupBy([], (x) => x)`,
        expected: {},
      },
    ],
  },
  {
    id: 'ts-typed-debounce',
    title: 'Type a debounce function (generic arguments)',
    difficulty: 'Medium',
    topics: ['Generics', 'Rest parameters', 'Parameters', 'ReturnType'],
    functionName: 'debounce',
    noAny: true,
    typeTests: [
      {
        label: 'the debounced function keeps the original parameters',
        code: `const search = debounce((query: string, page: number) => {}, 100)
type T = Expect<Equal<Parameters<typeof search>, [query: string, page: number]>>`,
      },
      {
        label: 'calling it with the wrong arguments is a type error',
        code: `const search = debounce((query: string) => {}, 100)
search('ts')
// @ts-expect-error
search(42)`,
      },
      {
        label: 'the debounced function returns void',
        code: `const search = debounce((query: string) => query.length, 100)
type T = Expect<Equal<ReturnType<typeof search>, void>>`,
      },
    ],
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
        label: 'passes all arguments',
        run: `${WAIT}let received
const d = debounce((a, b) => { received = [a, b] }, 30)
d('x', 'y')
await wait(80)
return received`,
        expected: ['x', 'y'],
      },
    ],
  },
  {
    id: 'ts-unknown-result',
    title: 'unknown, safe JSON parsing & a Result type',
    difficulty: 'Medium',
    topics: ['unknown', 'Result type', 'try/catch', 'Narrowing'],
    functionName: 'getAge',
    noAny: true,
    typeTests: [
      {
        label: 'Result<T> is { ok: true; value: T } | { ok: false; error: string }',
        code: `type T = Expect<Equal<Result<number>, { ok: true; value: number } | { ok: false; error: string }>>`,
      },
      {
        label: 'parseJson returns Result<unknown>',
        code: `const r = parseJson('1')
type T = Expect<Equal<typeof r, Result<unknown>>>`,
      },
      {
        label: 'getAge returns Result<number>',
        code: `type T = Expect<Equal<ReturnType<typeof getAge>, Result<number>>>`,
      },
      {
        label: 'checking ok narrows the result',
        code: `const r = getAge('{"age":3}')
if (r.ok) {
  const n: number = r.value
} else {
  const e: string = r.error
}`,
      },
      {
        label: 'reading value without checking ok is a type error',
        code: `const r = getAge('{"age":3}')
// @ts-expect-error
r.value`,
      },
    ],
    tests: [
      { args: ['{"age":30}'], expected: { ok: true, value: 30 } },
      { args: ['{"name":"Ana","age":7}'], expected: { ok: true, value: 7 } },
      {
        label: "getAge('oops') → { ok: false, error: <JSON.parse's message> }",
        run: `const r = getAge('oops')
return r.ok === false && typeof r.error === 'string' && r.error.length > 0`,
        expected: true,
      },
      { args: ['{"age":"30"}'], expected: { ok: false, error: 'age must be a number' } },
      { args: ['{"name":"Ana"}'], expected: { ok: false, error: 'age must be a number' } },
      { args: ['null'], expected: { ok: false, error: 'age must be a number' } },
      { args: ['[30]'], expected: { ok: false, error: 'age must be a number' } },
    ],
  },
  {
    id: 'ts-react-context',
    title: 'Type React context (and a safe useAuth hook)',
    difficulty: 'Medium',
    topics: ['React', 'createContext', 'useContext', 'children'],
    noAny: true,
    typeTests: [
      {
        label: 'useAuth() returns AuthContextValue (never undefined)',
        code: `type T = Expect<Equal<ReturnType<typeof useAuth>, AuthContextValue>>`,
      },
      {
        label: 'a component can use useAuth without null checks',
        code: `function Profile() {
  const { user, login, logout } = useAuth()
  login('Ana')
  logout()
  return <p>{user?.name}</p>
}`,
      },
      {
        label: '<AuthProvider> takes children',
        code: `const el = <AuthProvider><p>Hi</p></AuthProvider>`,
      },
      {
        label: '<AuthProvider /> without children is a type error',
        code: `// @ts-expect-error
const el = <AuthProvider />`,
      },
    ],
  },

  // ───────── Hard ─────────
  {
    id: 'ts-react-generic-list',
    title: 'Build a generic React component (List<T>)',
    difficulty: 'Hard',
    topics: ['React', 'Generic components', 'Inference', 'Render props'],
    noAny: true,
    typeTests: [
      {
        label: 'renderItem and getKey get the item type',
        code: `type User = { id: number; name: string }
const users: User[] = []
const el = (
  <List
    items={users}
    getKey={(u) => u.id}
    renderItem={(u) => {
      type T = Expect<Equal<typeof u, User>>
      return u.name
    }}
  />
)`,
      },
      {
        label: 'works for strings too',
        code: `const el = <List items={['a', 'b']} getKey={(s) => s} renderItem={(s) => s.toUpperCase()} />`,
      },
      {
        label: "using a property the item doesn't have is a type error",
        code: `const users: { id: number; name: string }[] = []
// @ts-expect-error
const el = <List items={users} getKey={(u) => u.id} renderItem={(u) => u.email} />`,
      },
      {
        label: 'getKey must return a string or number',
        code: `// @ts-expect-error
const el = <List items={[1, 2]} getKey={(n) => ({ n })} renderItem={(n) => n} />`,
      },
    ],
  },
  {
    id: 'ts-typed-event-emitter',
    title: 'A type-safe event emitter (generic class)',
    difficulty: 'Hard',
    topics: ['Generic classes', 'keyof', 'Mapped types', 'Indexed access'],
    functionName: 'Emitter',
    noAny: true,
    typeTests: [
      {
        label: "on('login') gets the login payload type",
        code: `type AppEvents = { login: { userId: number }; logout: undefined }
const e = new Emitter<AppEvents>()
e.on('login', (payload) => {
  type T = Expect<Equal<typeof payload, { userId: number }>>
})`,
      },
      {
        label: 'emitting the wrong payload is a type error',
        code: `const e = new Emitter<{ login: { userId: number } }>()
e.emit('login', { userId: 1 })
// @ts-expect-error
e.emit('login', { userId: '1' })`,
      },
      {
        label: 'an unknown event name is a type error',
        code: `const e = new Emitter<{ login: { userId: number } }>()
// @ts-expect-error
e.on('signup', () => {})`,
      },
      {
        label: 'on() returns an unsubscribe function',
        code: `const e = new Emitter<{ logout: undefined }>()
const off = e.on('logout', () => {})
type T = Expect<Equal<typeof off, () => void>>`,
      },
    ],
    tests: [
      {
        label: 'emit calls every listener with the payload',
        run: `const e = new Emitter()
const got = []
e.on('a', (p) => got.push('first ' + p))
e.on('a', (p) => got.push('second ' + p))
e.emit('a', 1)
return got`,
        expected: ['first 1', 'second 1'],
      },
      {
        label: 'only listeners of that event run',
        run: `const e = new Emitter()
const got = []
e.on('a', (p) => got.push(p))
e.emit('b', 2)
return got`,
        expected: [],
      },
      {
        label: 'the function returned by on() unsubscribes',
        run: `const e = new Emitter()
const got = []
const off = e.on('a', (p) => got.push(p))
e.emit('a', 1)
off()
e.emit('a', 2)
return got`,
        expected: [1],
      },
    ],
  },
  {
    id: 'ts-mapped-types',
    title: 'Implement Partial, Required, Readonly (mapped types)',
    difficulty: 'Hard',
    topics: ['Mapped types', 'keyof', 'Modifiers ? and readonly', '-?'],
    noAny: true,
    typeTests: [
      {
        label: 'MyPartial makes every property optional',
        code: `type Todo = { title: string; done: boolean }
type T = Expect<Equal<MyPartial<Todo>, { title?: string; done?: boolean }>>`,
      },
      {
        label: 'MyRequired removes every ?',
        code: `type Todo = { title?: string; done?: boolean }
type T = Expect<Equal<MyRequired<Todo>, { title: string; done: boolean }>>`,
      },
      {
        label: 'MyReadonly makes every property readonly',
        code: `type Todo = { title: string; done: boolean }
type T = Expect<Equal<MyReadonly<Todo>, { readonly title: string; readonly done: boolean }>>`,
      },
      {
        label: 'Mutable removes readonly',
        code: `type Todo = { readonly title: string; readonly done: boolean }
type T = Expect<Equal<Mutable<Todo>, { title: string; done: boolean }>>`,
      },
      {
        label: 'Nullable<T> allows null on every property',
        code: `type Todo = { title: string; done: boolean }
type T = Expect<Equal<Nullable<Todo>, { title: string | null; done: boolean | null }>>`,
      },
    ],
  },
  {
    id: 'ts-pick-omit',
    title: 'Implement Pick, Exclude, Omit and Record',
    difficulty: 'Hard',
    topics: ['Mapped types', 'Conditional types', 'Distributive', 'keyof'],
    noAny: true,
    typeTests: [
      {
        label: "MyPick<Todo, 'title' | 'done'>",
        code: `type Todo = { title: string; description: string; done: boolean }
type T = Expect<Equal<MyPick<Todo, 'title' | 'done'>, { title: string; done: boolean }>>`,
      },
      {
        label: "MyPick with a key that doesn't exist is a type error",
        code: `type Todo = { title: string; description: string; done: boolean }
// @ts-expect-error
type T = MyPick<Todo, 'nope'>`,
      },
      {
        label: "MyExclude<'a' | 'b' | 'c', 'a'> → 'b' | 'c'",
        code: `type T = Expect<Equal<MyExclude<'a' | 'b' | 'c', 'a'>, 'b' | 'c'>>`,
      },
      {
        label: "MyOmit<Todo, 'description'>",
        code: `type Todo = { title: string; description: string; done: boolean }
type T = Expect<Equal<MyOmit<Todo, 'description'>, { title: string; done: boolean }>>`,
      },
      {
        label: "MyRecord<'a' | 'b', number>",
        code: `type T = Expect<Equal<MyRecord<'a' | 'b', number>, { a: number; b: number }>>`,
      },
    ],
  },
  {
    id: 'ts-conditional-infer',
    title: 'Implement ReturnType, Parameters & Awaited (infer)',
    difficulty: 'Hard',
    topics: ['Conditional types', 'infer', 'Recursive types'],
    typeTests: [
      {
        label: 'MyReturnType',
        code: `type A = Expect<Equal<MyReturnType<() => string>, string>>
type B = Expect<Equal<MyReturnType<(n: number) => Promise<boolean>>, Promise<boolean>>>`,
      },
      {
        label: "MyReturnType<string> is a type error (it's not a function)",
        code: `// @ts-expect-error
type T = MyReturnType<string>`,
      },
      {
        label: 'MyParameters',
        code: `type A = Expect<Equal<MyParameters<(a: number, b: string) => void>, [a: number, b: string]>>
type B = Expect<Equal<MyParameters<() => void>, []>>`,
      },
      {
        label: 'MyAwaited unwraps promises (even nested ones)',
        code: `type A = Expect<Equal<MyAwaited<Promise<string>>, string>>
type B = Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>
type C = Expect<Equal<MyAwaited<boolean>, boolean>>`,
      },
      {
        label: 'ElementType gets the item type of an array',
        code: `type A = Expect<Equal<ElementType<string[]>, string>>
type B = Expect<Equal<ElementType<(number | boolean)[]>, number | boolean>>
type C = Expect<Equal<ElementType<number>, number>>`,
      },
    ],
  },
  {
    id: 'ts-template-literal-types',
    title: 'Template literal types & key remapping',
    difficulty: 'Hard',
    topics: ['Template literal types', 'Capitalize', 'Key remapping (as)', 'Mapped types'],
    noAny: true,
    typeTests: [
      {
        label: "EventHandlerName<'click'> → 'onClick'",
        code: `type A = Expect<Equal<EventHandlerName<'click'>, 'onClick'>>
type B = Expect<Equal<EventHandlerName<'click' | 'focus'>, 'onClick' | 'onFocus'>>`,
      },
      {
        label: 'Getters<{ name: string; age: number }>',
        code: `type T = Expect<Equal<Getters<{ name: string; age: number }>, { getName: () => string; getAge: () => number }>>`,
      },
      {
        label: "CssLength allows '10px', '1.5rem' and '50%'",
        code: `const a: CssLength = '10px'
const b: CssLength = '1.5rem'
const c: CssLength = '50%'`,
      },
      {
        label: "'10em' and 'px' are not a CssLength",
        code: `// @ts-expect-error
const a: CssLength = '10em'
// @ts-expect-error
const b: CssLength = 'px'`,
      },
    ],
  },
  {
    id: 'ts-deep-readonly',
    title: 'Recursive types: DeepReadonly & DeepPartial',
    difficulty: 'Hard',
    topics: ['Recursive types', 'Mapped types', 'Conditional types', 'Arrays'],
    noAny: true,
    typeTests: [
      {
        label: 'DeepReadonly makes nested objects readonly',
        code: `type Config = { server: { host: string; port: number }; debug: boolean }
type T = Expect<Equal<DeepReadonly<Config>, {
  readonly server: { readonly host: string; readonly port: number }
  readonly debug: boolean
}>>`,
      },
      {
        label: 'DeepReadonly makes arrays readonly too',
        code: `type T = Expect<Equal<DeepReadonly<{ tags: string[] }>, { readonly tags: readonly string[] }>>`,
      },
      {
        label: 'DeepReadonly leaves functions alone',
        code: `type T = Expect<Equal<DeepReadonly<{ log: (msg: string) => void }>, { readonly log: (msg: string) => void }>>`,
      },
      {
        label: 'changing a nested value is a type error',
        code: `const config = {} as DeepReadonly<{ server: { port: number } }>
// @ts-expect-error
config.server.port = 80`,
      },
      {
        label: 'DeepPartial makes nested properties optional',
        code: `type Config = { server: { host: string; port: number }; debug: boolean }
type T = Expect<Equal<DeepPartial<Config>, { server?: { host?: string; port?: number }; debug?: boolean }>>`,
      },
    ],
  },
]

for (const problem of codingTs) problem.category = 'typescript'

export default codingTs
