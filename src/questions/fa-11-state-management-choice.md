## 📄 Original answer (PDF)

**Question:** As an Architect, when do you choose Redux/Zustand vs. React Context vs. React Query?

**Answer:** React Query (or RTK Query) handles asynchronous server state (caching, deduplication, retries). Context is for static/slow-moving global UI state (themes, user auth info). Zustand/Redux is for complex, rapidly changing synchronous client state (multi-step wizards, complex UI interactions).

**Real-time example:** Removing 60% of Redux boilerplate by migrating all API calls to React Query, leaving Redux purely to manage the state of a complex, interactive multi-pane drawing tool on the client.

---

## 💡 Classify the state first

| Kind of state | Example | Best tool |
|---|---|---|
| **Server state** (owned by the backend, cached on the client) | products, orders, user profile | **TanStack Query / RTK Query / SWR**, or **server components** in Next.js |
| **URL state** | filters, sort, page, selected tab, search | **Router search params** (`useSearchParams`, `nuqs`) |
| **Form state** | checkout form, validation errors | **React Hook Form** + zod, or React 19 form actions |
| **Local UI state** | open/closed, hover, input text | **`useState` / `useReducer`** |
| **Global client state, rarely changing** | theme, locale, logged-in user, feature flags | **Context** |
| **Global client state, complex or frequently changing** | editor, canvas, drag-and-drop, multi-pane tools, undo/redo | **Zustand** or **Redux Toolkit** |

**Most "we need Redux" apps are really server-state apps.** Moving API data to a query library usually removes most of the global state, as in the PDF's example.

---

## 💡 Why Context isn't a store

```tsx
const AppContext = createContext(null)

<AppContext value={{ user, theme, cart, notifications }}>   {/* one big context */}
  <App />
</AppContext>
// ❌ ANY change (a new notification) re-renders EVERY component using useContext(AppContext)
```

- **Context has no selectors.** Every consumer re-renders when the value changes.
- **Fine for slow-moving values.** Split contexts by concern (`ThemeContext`, `AuthContext`) and memoise the value.
- **For frequent updates, use a store with selectors:**

```ts
// Zustand: components subscribe to slices, so only what changed re-renders
const useEditor = create((set) => ({
  tool: 'pen',
  shapes: [],
  setTool: (tool) => set({ tool }),
  addShape: (shape) => set((s) => ({ shapes: [...s.shapes, shape] })),
}))

const tool = useEditor((s) => s.tool)          // re-renders only when tool changes
```

---

## 💡 Zustand vs Redux Toolkit

| | **Zustand** | **Redux Toolkit** |
|---|---|---|
| Boilerplate | minimal | low (with RTK), more structure |
| Structure for big teams | DIY conventions | strong conventions: slices, actions, middleware, style guide |
| DevTools, time travel | via middleware | ✅ first-class |
| Side effects | in actions | listener middleware, thunks |
| Server state | pair it with TanStack Query | **RTK Query built in** |
| Bundle | ~1 KB | larger |
| Pick when | small or medium apps, or isolated complex widgets | large apps and many teams that want one opinionated pattern, or apps already on Redux |

**Also consider:** Jotai (atomic state), XState (complex flows as state machines), signals (Preact / Legend-State).

---

## 💡 Decision flow

```
Does the data come from the server?            → TanStack Query / RTK Query / server components
Should it be shareable or bookmarkable?         → URL
Is it a form?                                   → React Hook Form (+ zod)
Used by one component or a small subtree?       → useState / useReducer (lift up if needed)
Global, but rarely changes?                     → Context (split by concern)
Global, complex, frequently updated?            → Zustand / Redux Toolkit
```

**Architect move:** document this table in an ADR and in the "how we build" guide, so every team picks state tools the same way.

---

## 🎯 Interview answer

> "I start by classifying state rather than picking a library. Server state like products and orders goes in TanStack Query or RTK Query, or server components in Next.js, because it needs caching, deduplication, retries and invalidation; that alone usually removes most global state, like the PDF's 60% Redux reduction. Shareable state like filters goes in the URL, forms in React Hook Form with zod, and local UI state in `useState`. Context is for slow-moving global values like theme, locale and the current user, split by concern, because every consumer re-renders when its value changes and it has no selectors. For complex, frequently changing client state like an editor or a multi-pane tool, I use a store with selectors: Zustand for its simplicity, or Redux Toolkit when a large organisation benefits from its conventions, DevTools, middleware and built-in RTK Query. I write this decision guide down in an ADR so every team chooses consistently."
