## Problem

Type an auth **context** the way most React + TypeScript codebases do:

1. **`AuthContext`**: its value is `AuthContextValue`, or `undefined` when there's no provider above.
2. **`AuthProvider`**: type `children`, and the `user` state (`{ name: string }` or `null`).
3. **`useAuth()`**: returns `AuthContextValue`, **never `undefined`**. If it's used outside the provider, it throws a clear error. Components then use it with **no null checks**.

## Examples

```tsx
function Profile() {
  const { user, login, logout } = useAuth()   // ✅ no "possibly undefined" errors
  return <p>{user?.name}</p>                  // user itself can still be null (logged out)
}

<AuthProvider><App /></AuthProvider>   // ✅
<AuthProvider />                       // ❌ children are required
```

## Hints

1. `createContext<Type | undefined>(undefined)`.
2. Props: `{ children: ReactNode }` (`ReactNode` is already imported).
3. `useState<AuthContextValue['user']>(null)` reuses the type from `AuthContextValue`.
4. In `useAuth`: read the context, `if (!ctx) throw new Error(...)`, then `return ctx`. After the check, TypeScript knows it isn't `undefined`.

<!-- SOLUTION -->

## Solution

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

type AuthContextValue = {
  user: { name: string } | null
  login: (name: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)

  const value: AuthContextValue = {
    user,
    login: (name) => setUser({ name }),
    logout: () => setUser(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx   // narrowed: AuthContextValue
}
```

(In React 19 you can also render `<AuthContext value={value}>` without `.Provider`.)

## Why undefined + a custom hook?

| Option | Problem |
|---|---|
| `createContext<AuthContextValue>({} as AuthContextValue)` | A lie: without a provider, `login` is undefined and crashes at runtime |
| `createContext<AuthContextValue \| undefined>(undefined)`, used directly | Correct, but **every** component needs `ctx?.` or a check |
| ✅ `undefined` default + `useAuth()` that throws | Correct, checked **once**, and a clear error message if the provider is missing |

The custom hook also hides the context object: components import `useAuth`, not `AuthContext`.

## Typing the provider value

Writing `const value: AuthContextValue = { ... }` gives the `login: (name) => ...` callback its parameter type from context, and checks you didn't forget a field.

**Performance tip:** this `value` object is new on every render, so every consumer re-renders. In a real app, wrap it in `useMemo` (or let the React Compiler handle it).

## 🎯 Interview answer

> "I create the context with `createContext<Value | undefined>(undefined)`, because without a provider there really is no value. Then I write a custom hook like `useAuth` that reads the context, throws a helpful error if it's undefined, and returns the narrowed type, so components never deal with undefined. The provider types `children` as `ReactNode`, and I annotate the provider value with the context type so missing fields are caught. I avoid `{} as Value` defaults, because they hide a missing provider until runtime."
