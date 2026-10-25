## Short answer

**Adding TypeScript to a React app means typing four things:**

| What | How | Example |
|---|---|---|
| **Plain data & functions** | Annotations and custom `type`s | `const words: string[]`, `function getRandomWord(): string` |
| **State** | Pass a **generic** to `useState` | `useState<string[]>([])` |
| **Components** | Type the return value | `function Header(): JSX.Element` |
| **Props** | One custom type per component | `type KeyboardProps = { addGuessedLetter: (letter: string) => void }` |

**Analogy: labelling boxes before a house move** 📦 JavaScript is moving house with unlabelled boxes: everything works until you open "kitchen" and find shoes. TypeScript puts a label on every box (variable, prop, state) and the movers (the compiler) refuse to put a box in the wrong room. The app works the same; you just find mistakes **before** they reach the user.

> 📺 Notes from the video **"TypeScript in React - Full Tutorial"** (freeCodeCamp, taught by Rachel Johnson from Scrimba). She converts the **Assembly: Endgame** hangman game from the Learn React course to TypeScript, one file at a time. Extra notes of mine are marked **💭 My thoughts**.

---

## Step 0: create the project with Vite (TypeScript template)

Adding TypeScript to an existing React app by hand means installing packages, writing config files and renaming files. The video lets **Vite** do it all:

```bash
npm create vite@latest .      # framework: React, variant: TypeScript
npm install
npm install clsx react-confetti   # the game's two extra packages
```

```
┌──────────────── new project ────────────────┐
│ package.json                                │
│ ╔═══════════════════════════════════════╗   │
│ ║ ★ typescript, typescript-eslint       ║   │
│ ║ ★ @types/react, @types/react-dom      ║   │
│ ╚═══════════════════════════════════════╝   │
│ tsconfig.json ──► tsconfig.app.json  (src)  │
│               └─► tsconfig.node.json (vite) │
│ src/*.ts / *.tsx  ◄── ★ new file endings    │
└─────────────────────────────────────────────┘
```

| What's new | Why |
|---|---|
| `@types/react`, `@types/react-dom` | React is written in JS; these packages add its types |
| `tsconfig.json` → two files | One config for your app code (`src`), one for Node tools like `vite.config.ts` |
| `.ts` / `.tsx` | `.tsx` = TypeScript **with JSX**. Plain logic files are `.ts` |

---

## Step 1: type plain data (`words.ts`, `languages.ts`)

```ts
// words.ts
export const words: string[] = ["about", "alert", "argue", /* ... */]
```

`languages` is an array of objects. There are **two ways** to type it:

```ts
// ❌ Way 1: inline object type (works, but you can't reuse it)
export const languages: { name: string; backgroundColor: string; color: string }[] = [ ... ]

// ✅ Way 2: a custom type (recommended)
export type Language = {
  name: string
  backgroundColor: string
  color: string
}

export const languages: Language[] = [
  { name: "HTML", backgroundColor: "#E2680F", color: "#F9F4DA" },
  { name: "CSS",  backgroundColor: "#328AF1", color: "#F9F4DA" },
  // ...
]
```

```
╔═══════════════ ★ type Language ═══════════════╗
║  name: string                                 ║
║  backgroundColor: string                      ║
║  color: string                                ║
╚═══════════════════════════════════════════════╝
             │ used by
             ▼
  languages: Language[]   ──► later: LanguageChips props (Step 7)
```

> **Tip from the video:** hover over any variable in the editor to see what type TypeScript has worked out (**inferred**) for it.

---

## Step 2: type functions (`utils.ts`) and refactor

Each function gets **parameter types** and a **return type**. The video then notices the same "random index" line in two functions and pulls it into one typed helper:

```ts
import { words } from "./words"

// ★ new helper: one place for the random index logic
function getRandomIndex(arr: string[]): number {
  return Math.floor(Math.random() * arr.length)
}

export function getRandomWord(): string {
  return words[getRandomIndex(words)]
}

export function getFarewellText(language: string): string {
  const options: string[] = [
    `Farewell, ${language}`,
    `Adios, ${language}`,
    `R.I.P., ${language}`,
    // ...
  ]
  return options[getRandomIndex(options)]
}
```

| Annotation | Why |
|---|---|
| `language: string` | Without it the parameter is **implicitly `any`**, an error in strict mode. Parameters are the one place you **must** type |
| `): string` | The return type. Optional (inferred), but it documents intent and catches a wrong `return` |
| `options: string[]` | An array of strings |

---

## Step 3: type `useState` with a generic

`useState` **infers** the type from the initial value. That works for `""` but **not** for `[]`:

```
useState("")  ──► string            ✅ fine
useState([])  ──► never[] / any[]   ⚠️ "an array of… what?"
```

So pass the type yourself inside **angle brackets** (a generic):

```tsx
// App.tsx
const [currentWord, setCurrentWord] = useState<string>((): string => getRandomWord())
const [guessedLetters, setGuessedLetters] = useState<string[]>([])
```

The video shows a simplified picture of how `useState` is declared:

```ts
declare function useState<T>(
  initialState: T
): [T, (newState: T) => void]
```

```
       useState<string[]>([])
                 │
          T = string[]
       ┌─────────┴──────────┐
       ▼                    ▼
 guessedLetters       setGuessedLetters
 : string[]           : (newState: string[]) => void
```

| What's new | Why |
|---|---|
| `useState<string[]>` | **T** sets the type of the value **and** of the setter |
| `setCurrentWord(true)` → ❌ | *"Argument of type 'boolean' is not assignable to parameter of type 'SetStateAction<string>'"* |
| `(): string => getRandomWord()` | A **lazy initial value** (runs only on the first render), with its return type added |

---

## Step 4: derived values and arrow functions

```tsx
// Derived values (the video types all of them, for practice)
const numGuessesLeft: number = languages.length - 1
const wrongGuessCount: number =
  guessedLetters.filter((letter: string): boolean => !currentWord.includes(letter)).length
const isGameWon: boolean =
  currentWord.split("").every((letter: string): boolean => guessedLetters.includes(letter))
const isGameLost: boolean = wrongGuessCount >= numGuessesLeft
const isGameOver: boolean = isGameWon || isGameLost
const lastGuessedLetter: string = guessedLetters[guessedLetters.length - 1]
const isLastGuessIncorrect: boolean = lastGuessedLetter && !currentWord.includes(lastGuessedLetter) // ⚠️ see below

// Static values: left untyped on purpose
const alphabet = "abcdefghijklmnopqrstuvwxyz"
```

| Detail | Why |
|---|---|
| `(letter: string): boolean =>` | To type an arrow function's parameter you **need the parentheses**: `letter: string => …` is a syntax error |
| `alphabet` not typed | `const` + a string infers the **literal type** `"abcdefghijklmnopqrstuvwxyz"`, which is even more exact than `string` |
| "We don't *have* to type everything" | These are local derived values: TypeScript already infers them correctly |

> 💭 **A bug the video leaves in.** At 22:58 the editor still shows a red underline under `isLastGuessIncorrect`. `a && b` returns `a` when `a` is falsy, so the type is `string | boolean`, not `boolean`. The compiler says: *"Type 'string \| boolean' is not assignable to type 'boolean'"*. **Fix:** turn the string into a real boolean with `!!`:
> ```ts
> const isLastGuessIncorrect: boolean = !!lastGuessedLetter && !currentWord.includes(lastGuessedLetter)
> ```
> This is a good example of an annotation **catching a real problem**: without it, a `""` would quietly be passed to a `boolean` prop.

---

## Step 5: functions inside the component

```tsx
function addGuessedLetter(letter: string): void {
  setGuessedLetters((prevLetters: string[]): string[] =>
    prevLetters.includes(letter) ? prevLetters : [...prevLetters, letter]
  )
}

function startNewGame(): void {
  setCurrentWord(getRandomWord())
  setGuessedLetters([])
}
```

| The 4 annotations in `addGuessedLetter` | Needed? |
|---|---|
| `letter: string` | ✅ **Yes**: it was implicitly `any` |
| `): void` | Optional: makes it clear the function returns nothing and catches an accidental `return` |
| `prevLetters: string[]` | Optional: already inferred from `useState<string[]>` |
| `): string[]` on the callback | Optional: inferred the same way |

---

## Step 6: type components (`JSX.Element`)

The app gets split into components: `Header`, `ConfettiContainer`, `GameStatus`, `LanguageChips`, `WordLetters`, `AriaLiveStatus`, `Keyboard`, `NewGameButton`.

```tsx
// Header.tsx
import type { JSX } from 'react'

export default function Header(): JSX.Element {
  return (
    <header>
      <h1>Assembly: Endgame</h1>
      <p>Guess the word within 8 attempts to keep the programming world safe from Assembly!</p>
    </header>
  )
}
```

A component that **sometimes renders nothing** returns `null` too, so use a **union**:

```tsx
// ConfettiContainer.tsx
export default function ConfettiContainer({ isGameWon }: { isGameWon: boolean }): JSX.Element | null {
  if (!isGameWon) {
    return null
  }
  return <Confetti recycle={false} numberOfPieces={1000} />
}
```

```
 function Header(): ★ JSX.Element          ──► always renders
 function ConfettiContainer(): ★ JSX.Element | null
                                   │            │
                              game won      not won → nothing
```

| What's new | Why |
|---|---|
| `import type { JSX } from 'react'` | `import type` brings in a **type only**; it's removed from the JS output |
| `: JSX.Element` | Optional (inferred), but stops you from accidentally returning something that isn't JSX |
| `JSX.Element \| null` | Typing only `JSX.Element` gives a red underline on `return null` |

**`React.FC` (the older style):**

```tsx
const Header: React.FC<Props> = () => { ... }
```

The video says many developers now avoid `React.FC` because it **adds `children` to the props by default**, even when the component doesn't use them, so it sticks with `(): JSX.Element`.

> 💭 **Correction:** that was true for `@types/react` **17 and older**. Since **React 18** types, `React.FC` **no longer adds `children`**. Plain functions with typed props are still the most common style today, mainly because they're simpler and work the same way with generics.

---

## Step 7: type props: inline → custom type → imported type

**Props are one object**, so you type the whole object after the `{ }`:

```tsx
// 1) Inline: fine for 1 prop, messy for 5
function GameStatus({ isGameWon, isGameLost, ... }: {
  isGameWon: boolean
  isGameLost: boolean
  ...
}): JSX.Element { ... }
```

```tsx
// 2) ✅ Custom type: name it <Component>Props
type GameStatusProps = {
  isGameWon: boolean
  isGameLost: boolean
  isGameOver: boolean
  isLastGuessIncorrect: boolean
  wrongGuessCount: number
}

export default function GameStatus({
  isGameWon, isGameLost, isGameOver, isLastGuessIncorrect, wrongGuessCount,
}: GameStatusProps): JSX.Element {
  const gameStatusClass: string = clsx("game-status", {
    won: isGameWon,
    lost: isGameLost,
    farewell: !isGameOver && isLastGuessIncorrect,
  })
  // ...
}
```

```tsx
// 3) ✅ Import a type from another file (export it first in languages.ts)
import type { Language } from '../languages'

type LanguageChipsProps = {
  languages: Language[]
  wrongGuessCount: number
}
```

```
 languages.ts                         LanguageChips.tsx
┌──────────────────────┐   import    ┌──────────────────────────────┐
│ ★ export type Language│ ─────────► │ import type { Language }     │
│ export const languages│            │ languages: Language[]        │
└──────────────────────┘            └──────────────────────────────┘
        one source of truth: change it once, every user updates
```

---

## Step 8: type values inside a component (`Omit`, `.map()`)

```tsx
export default function LanguageChips({ languages, wrongGuessCount }: LanguageChipsProps): JSX.Element {
  const languageElements: JSX.Element[] = languages.map((lang: Language, index: number): JSX.Element => {
    const isLanguageLost: boolean = index < wrongGuessCount
    const styles: Omit<Language, "name"> = {
      backgroundColor: lang.backgroundColor,
      color: lang.color,
    }
    const className: string = clsx("chip", isLanguageLost && "lost")
    return (
      <span className={className} style={styles} key={lang.name}>
        {lang.name}
      </span>
    )
  })
  // ...
}
```

| What's new | Why |
|---|---|
| `Omit<Language, "name">` | A **utility type**: "`Language` without `name`" = `{ backgroundColor; color }`. Reuses the type instead of writing it again |
| `(lang: Language, index: number): JSX.Element` | The `.map` callback: one element per item |
| `JSX.Element[]` | `.map` returns an **array** of whatever the callback returns |
| `clsx(...)` → `string` | `clsx` builds a class name string |

The same pattern repeats in `WordLetters` (`letter: string, index: number`, `shouldRevealLetter: boolean`) and `AriaLiveStatus` (`guessedLetters: string[]`, `numGuessesLeft: number`).

---

## Step 9: type function props (callbacks)

Functions passed down as props are typed with **arrow syntax**: `prop: (params) => returnType`.

```tsx
// NewGameButton.tsx
type NewGameButtonProps = {
  isGameOver: boolean
  startNewGame: () => void              // ★ no params, returns nothing
}

export default function NewGameButton({ isGameOver, startNewGame }: NewGameButtonProps): JSX.Element | null {
  if (!isGameOver) return null
  return <button className="new-game" onClick={startNewGame}>New Game</button>
}
```

```tsx
// Keyboard.tsx (the final challenge)
type KeyboardProps = {
  alphabet: string
  guessedLetters: string[]
  currentWord: string
  isGameOver: boolean
  addGuessedLetter: (letter: string) => void   // ★ takes a string, returns nothing
}

export default function Keyboard({
  alphabet, guessedLetters, currentWord, isGameOver, addGuessedLetter,
}: KeyboardProps): JSX.Element {
  const keyboardElements: JSX.Element[] = alphabet.split("").map((letter: string): JSX.Element => {
    const isGuessed: boolean = guessedLetters.includes(letter)
    const isCorrect: boolean = isGuessed && currentWord.includes(letter)
    const isWrong: boolean = isGuessed && !currentWord.includes(letter)
    const className: string = clsx({ correct: isCorrect, wrong: isWrong })

    return (
      <button
        className={className}
        key={letter}
        disabled={isGameOver}
        onClick={() => addGuessedLetter(letter)}
      >
        {letter.toUpperCase()}
      </button>
    )
  })
  // ...
}
```

```
 App.tsx                                         Keyboard.tsx
┌────────────────────────────────┐   prop   ┌──────────────────────────────────┐
│ function addGuessedLetter(     │ ───────► │ ★ addGuessedLetter:              │
│   letter: string): void {...}  │          │     (letter: string) => void     │
└────────────────────────────────┘          └──────────────────────────────────┘
   the prop type must match the function's shape, or App.tsx gets an error
```

| Example | Type |
|---|---|
| no params, returns nothing | `() => void` |
| one string param, returns nothing | `(letter: string) => void` |
| a `name` string, returns a number | `(name: string) => number` |

> Note: `isCorrect` here is fine as `boolean` because `isGuessed` is already a boolean, unlike `lastGuessedLetter` in Step 4.

---

## Final picture

```
┌──────────────────────────────── App.tsx ────────────────────────────────┐
│ useState<string>(…)  currentWord      useState<string[]>([]) guessed    │
│ derived: number / boolean / string    functions: (letter: string): void │
│                                                                         │
│  <Header/>              (): JSX.Element                                 │
│  <ConfettiContainer/>   ({isGameWon}: {…}): JSX.Element | null          │
│  <GameStatus/>          GameStatusProps          (custom type)          │
│  <LanguageChips/>       LanguageChipsProps ◄── import type { Language } │
│  <WordLetters/>         WordLettersProps                                │
│  <AriaLiveStatus/>      AriaLiveStatusProps                             │
│  <Keyboard/>            KeyboardProps: addGuessedLetter: (l) => void    │
│  <NewGameButton/>       NewGameButtonProps: startNewGame: () => void    │
└─────────────────────────────────────────────────────────────────────────┘
        words.ts: string[]     languages.ts: Language[]     utils.ts: typed fns
```

**The point of the video in one sentence:** the app works exactly the same, but every value, state, prop and component now has a type, so mistakes show up in the editor instead of in the browser.

---

## 💭 My thoughts: what's good to know beyond the video

### 1. Don't over-annotate in real code

The video types **everything** for practice. In real projects the usual rule is:

| Always type | Usually let TypeScript infer |
|---|---|
| Function **parameters** and **props** | Local variables (`const isGameLost = …`) |
| `useState` when the initial value is `[]`, `null` or `{}` | `useState("")`, `useState(0)` |
| Exported functions' return types (optional, but helps) | Callback params in `.map`, `.filter` (already known) |

Extra annotations aren't free: they're more code to change later. Annotate where it **adds information or catches mistakes** (like Step 4's bug).

### 2. `JSX.Element` vs `ReactNode`

| Type | Accepts | Use it for |
|---|---|---|
| `JSX.Element` | A single JSX element only | A component's return type |
| `React.ReactNode` | JSX, strings, numbers, `null`, arrays… | **`children`** and any "render anything" prop |

```tsx
type CardProps = { title: string; children: React.ReactNode }
```

### 3. Typing events and the setter

```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) { setText(e.target.value) }
function handleSubmit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault() }

// passing a state setter down as a prop
type Props = { setGuessedLetters: React.Dispatch<React.SetStateAction<string[]>> }
```

Tip: hover over `onChange` in the editor and copy the type it shows.

### 4. Reuse types instead of rewriting them

- `Omit<Language, "name">` / `Pick<Language, "color">` (as in Step 8)
- `React.ComponentProps<typeof Keyboard>` gets another component's props
- `React.ComponentProps<"button">` gets all native `<button>` props, so you can extend them:
  ```tsx
  type ButtonProps = React.ComponentProps<"button"> & { variant: "primary" | "ghost" }
  ```

### 5. Make data more exact with `as const` + `satisfies`

```ts
export const languages = [
  { name: "HTML", backgroundColor: "#E2680F", color: "#F9F4DA" },
] as const satisfies readonly Language[]
```

`satisfies` checks the shape **without** widening the values, so `languages[0].name` is the literal `"HTML"`, not just `string`.

---

## Cheat sheet

| Concept | One-liner |
|---|---|
| New TS + React project | `npm create vite@latest` → React → TypeScript |
| `.ts` vs `.tsx` | `.tsx` when the file contains JSX |
| Array type | `string[]`, `Language[]` |
| Custom type | `type Language = { name: string; … }` |
| Typed function | `function f(x: string): number { … }` |
| Typed arrow function | `(letter: string): boolean => …` (parentheses required) |
| State with a generic | `useState<string[]>([])` |
| Component return type | `(): JSX.Element` (`import type { JSX } from 'react'`) |
| Might render nothing | `JSX.Element \| null` |
| Props | `type XProps = {…}` then `({ a, b }: XProps)` |
| Import a type | `import type { Language } from './languages'` |
| Function prop | `onSelect: (letter: string) => void` |
| Remove a property | `Omit<Language, "name">` |
| Array from `.map` of JSX | `JSX.Element[]` |
| `a && b` with a string `a` | Type is `string \| boolean`; use `!!a && b` for a real boolean |

---

## Interview Q&A

**Q: How do you type `useState`?**
Usually TypeScript infers it from the initial value. When the initial value doesn't say enough (`[]`, `null`, `{}`), pass a generic: `useState<string[]>([])` or `useState<User | null>(null)`. The generic sets the type of both the value and the setter.

**Q: How do you type component props?**
Create a type named `<Component>Props` with each prop and its type, then annotate the destructured props object: `function Keyboard({ alphabet }: KeyboardProps)`. Inline object types work for one or two props but get messy fast.

**Q: How do you type a callback prop?**
With function type syntax: `onGuess: (letter: string) => void`. The parent's function must match that shape.

**Q: `JSX.Element` vs `ReactNode`?**
`JSX.Element` is one rendered element, so it suits a component's return type. `ReactNode` is anything React can render (elements, strings, numbers, `null`, arrays), so it's the right type for `children`.

**Q: Should you use `React.FC`?**
It works. Older `@types/react` versions added `children` to every component's props, which is why many teams dropped it; React 18 types removed that. Most code today uses plain functions with typed props because they're simpler.

**Q: What does `import type` do?**
It imports only a type. It's erased from the JavaScript output, so it can't add runtime code or cause circular-import problems.

**Q: Why use `Omit` instead of writing the type again?**
`Omit<Language, "name">` stays in sync with `Language`. If a property's type changes, every place that reuses it updates automatically.

---

## 🎯 Interview answer

> "When I add TypeScript to a React app, I start from Vite's TypeScript template so the config is done for me. I type shared data with custom types, like a `Language` type that I export and reuse. For state, I let TypeScript infer simple values and pass a generic when the initial value is empty, like `useState<string[]>([])`. Every component gets a `Props` type, including function props such as `onGuess: (letter: string) => void`, and I reuse types with `import type` and utility types like `Omit`. I don't annotate every local variable, because inference handles that, but I do type parameters, props and exported functions, because that's where annotations catch real bugs. For example, `str && bool` is `string | boolean`, not `boolean`, and a type annotation catches that before it reaches a prop."
