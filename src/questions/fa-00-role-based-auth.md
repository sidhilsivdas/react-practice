## Short answer

**Role-based authentication means a route or component is protected by two checks:**

1. **Is the user logged in?** (authentication)
2. **Does the user's role allow this?** (authorization)

**The architecture splits this into two pieces with one job each:**

| Piece | Its only job |
|---|---|
| **`AuthProvider`** (Context) | Find out *who* the user is: log in, log out, check on page load |
| **`ProtectedRoute`** (wrapper) | Decide *if* this user may see this page, based on `allowedRoles` |
| **`useAuth()`** (custom hook) | The bridge: lets any component read the auth state safely |

**The key idea: the user has three states, not two.**

| Value | Meaning | What to show |
|---|---|---|
| `undefined` | We haven't checked yet (request in progress) | Loading… |
| `null` | We checked, the user is **not** logged in | Login / Permission denied |
| `User` | We checked, the user **is** logged in | The content (if the role matches) |

**Analogy: a nightclub** 🎟️ The **ticket office** (`AuthProvider`) checks who you are and gives you a wristband. The **bouncer at the VIP door** (`ProtectedRoute`) doesn't care how you got the wristband. They only check its colour (role). While the ticket office is still checking your ID, the bouncer says "wait" (loading), not "go away".

> 📺 Notes from the video **"Role-Based Authentication in React (Complete Tutorial)"** by Cosden Solutions, plus extra notes of mine marked **💭 My thoughts**.

---

## Step 0: the starting point

The video uses a **mock backend**: `getUser()` and `login()` wait 1 second, then return a token and a user with a `role`.

```
┌──────────────┐        ┌─────────────────────────────────────────┐
│   main.tsx   │        │  api/auth.ts  (mock backend)            │
│ RouterProvider│        │  testUser = { id, email, role:'admin' } │
│   "/" → App  │        │  getUser() / login()                    │
└──────────────┘        │   → wait 1s                             │
                        │   → [200, { authToken, user }]          │
                        └─────────────────────────────────────────┘
```

```ts
// types/user.ts
export type User = {
  id: number;
  email: string;
  role: string;   // a plain string in the video (see 💭 tip below)
};
```

```ts
// api/auth.ts: the mock backend
import { User } from '@/types/user';

const testUser: User = {
  id: 1,
  email: 'test@email.com',
  role: 'admin',
};

export async function getUser() {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // fake 1s network delay

  const authToken = generateAuthToken();

  return [200, { authToken, user: testUser }] as const;      // [status, body]
}

export async function login() {
  // exactly the same code as getUser()
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const authToken = generateAuthToken();

  return [200, { authToken, user: testUser }] as const;
}

function generateAuthToken() {
  return Math.random().toString(36).substring(2);              // random fake token
}
```

| Detail | Why it matters |
|---|---|
| `[200, {...}] as const` | A **readonly tuple**: TypeScript knows `response[1]` is `{ authToken, user }`, so destructuring it later is fully typed |
| `getUser()` and `login()` are identical | In a real app: `getUser` = "who am I?" (`GET /me`), `login` = send credentials |
| `role: string` | Any string is accepted. See the 💭 tip below for a safer version |

> 💭 **My tip:** make `role` a union: `role: 'admin' | 'viewer'`. Then `allowedRoles={['admn']}` (a typo) becomes a **type error** instead of a silent "Permission denied".

The plan has two steps: **(1) authentication** first, **(2) role checks** on top.

---

## Step 1: the context type with three states

```
╔═══════════════════════════════════════════╗
║ ★ type AuthContext                        ║
║   authToken?:   string | null             ║
║   currentUser?: User   | null             ║
║   handleLogin:  () => Promise<void>       ║
║   handleLogout: () => Promise<void>       ║
╚═══════════════════════════════════════════╝
        ?  → undefined = still checking ⏳
     null  → checked, not logged in   🚫
     User  → checked, logged in       ✅
```

```tsx
type AuthContext = {
  authToken?: string | null
  currentUser?: User | null
  handleLogin: () => Promise<void>
  handleLogout: () => Promise<void>
}

const AuthContext = createContext<AuthContext | undefined>(undefined)
```

| What's new | Why |
|---|---|
| `?` (optional) on the values | `undefined` becomes the **"loading"** state |
| `\| null` | `null` means **"we asked the backend, and the answer was no"** |
| `createContext<... \| undefined>(undefined)` | No default value, so `useAuth` can detect a missing provider |

---

## Step 2: `AuthProvider` + `useAuth`

```
┌─────────────────── main.tsx ───────────────────┐
│ ╔════════════════ ★ AuthProvider ════════════╗ │
│ ║ useState: authToken, currentUser (undefined)║ │
│ ║ handleLogin  → login() → set token & user  ║ │
│ ║              ✖ error → set both to null    ║ │
│ ║ handleLogout → set both to null            ║ │
│ ║      ┌──────────────────────┐              ║ │
│ ║      │ RouterProvider → App │ ◄── ★ useAuth()║ │
│ ║      └──────────────────────┘              ║ │
│ ╚════════════════════════════════════════════╝ │
└────────────────────────────────────────────────┘
```

```tsx
// components/AuthProvider.tsx
import { getUser, login } from '@/api/auth'
import { User } from '@/types/user'
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'

type AuthProviderProps = PropsWithChildren

export default function AuthProvider({ children }: AuthProviderProps) {
  const [authToken, setAuthToken] = useState<string | null>()   // starts undefined
  const [currentUser, setCurrentUser] = useState<User | null>() // starts undefined

  async function handleLogin() {
    try {
      const response = await login()
      const { authToken, user } = response[1]
      setAuthToken(authToken)
      setCurrentUser(user)
    } catch {
      setAuthToken(null)
      setCurrentUser(null)
    }
  }

  async function handleLogout() {
    setAuthToken(null)
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ authToken, currentUser, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside of a AuthProvider')
  }
  return context
}
```

```tsx
// main.tsx: wrap the whole app
<AuthProvider>
  <RouterProvider router={router} />
</AuthProvider>

// App.tsx: use it
export default function App() {
  const { authToken, handleLogin, handleLogout } = useAuth()

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold">Cosden Solutions</h1>
      <Link to="/protected">Protected Route</Link>   {/* added in Step 3 */}
      {authToken ? (
        <button onClick={handleLogout}>Logout</button>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  )
}
```

| What's new | Why |
|---|---|
| `useState<User \| null>()` with no initial value | Starts as `undefined`: "we don't know yet" |
| `catch` sets `null` | The rest of the app learns "we checked, not logged in" |
| `useAuth()` throws outside the provider | A clear error instead of silent `undefined` bugs |
| `handleLogout` is `async` with no `await` | Only because the type says `Promise<void>`. In a real app it would call a logout API |

**The bug in the video:** he forgot to wrap the app in `<AuthProvider>`, and the page showed *"useAuth must be used inside of a AuthProvider"*. That error is exactly why the guard hook exists: you find the mistake in one second.

---

## Step 3: `ProtectedRoute` checks the role

```
                      user visits /protected
                               │
        ╔══════════════ ★ ProtectedRoute(allowedRoles) ══════════════╗
        ║   const { currentUser } = useAuth()                        ║
        ║                                                            ║
        ║   undefined? ──────────────────────────► ⏳ Loading...      ║
        ║   null  OR  role not in allowedRoles? ─► 🚫 Permission denied║
        ║   otherwise ───────────────────────────► ✅ children        ║
        ╚════════════════════════════════════════════════════════════╝
```

```tsx
// components/ProtectedRoute.tsx
import { User } from '@/types/user'
import { PropsWithChildren } from 'react'
import { useAuth } from './AuthProvider'

type ProtectedRouteProps = PropsWithChildren & {
  allowedRoles?: User['role'][]
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { currentUser } = useAuth()

  if (currentUser === undefined) {
    return <div>Loading...</div>
  }

  if (currentUser === null || (allowedRoles && !allowedRoles.includes(currentUser.role))) {
    return <div>Permission denied</div>
  }

  return children
}
```

```tsx
// main.tsx: wrap any route you want to protect
{
  path: '/protected',
  element: (
    <ProtectedRoute allowedRoles={['admin']}>
      <div>Protected content</div>
    </ProtectedRoute>
  ),
}
```

| What's new | Why |
|---|---|
| `allowedRoles?` is optional | Leave it out to require login only, with no role check |
| `User['role'][]` | Indexed access type: "an array of whatever type `role` is". In the video that's `string[]`; with the union tip from Step 0 it becomes `('admin' \| 'viewer')[]` and typos are caught |
| Check `undefined` **first** | Never show "denied" while we're still checking |
| Uses `useAuth()`, not its own state | **Single responsibility**: it reads auth, it doesn't do auth |

---

## Step 4: check the user on page load

**The problem:** after a page reload, `currentUser` is `undefined` again, and nothing ever changes it. The page shows **Loading... forever** until the user clicks Login, and the protected page has no Login button.

```
╔══════════════ AuthProvider ═══════════════════════════╗
║ ★ useEffect(() => { fetchUser() }, [])  ← runs once   ║
║     fetchUser: getUser() → set token & user           ║
║                ✖ error   → set both to null           ║
╚═══════════════════════════════════════════════════════╝
  reload ──► undefined (⏳ 1s) ──► User ✅  or  null 🚫
```

```tsx
useEffect(() => {
  async function fetchUser() {
    try {
      const response = await getUser()
      const { authToken, user } = response[1]
      setAuthToken(authToken)
      setCurrentUser(user)
    } catch {
      setAuthToken(null)
      setCurrentUser(null)
    }
  }
  fetchUser()
}, [])
```

**Demo results from the video:**

- *(Before Step 4)* Login → **Protected content** ✅; Logout → **Permission denied** 🚫; reload → **Loading... forever** ⏳
- Role `admin` + `allowedRoles={['admin']}` → Loading... → **Protected content** ✅
- Role changed to `viewer` → Loading... → **Permission denied** 🚫
- `allowedRoles={['admin', 'viewer']}` → **Protected content** ✅

---

## Final picture

```
┌──────────────────────────── main.tsx ─────────────────────────────┐
│ AuthProvider  (WHO is the user?)                                  │
│  • state: authToken, currentUser  (undefined | null | value)      │
│  • on mount: getUser()   • handleLogin()   • handleLogout()       │
│  │                                                                │
│  └─ RouterProvider                                                │
│       ├─ "/"          → App            ── useAuth() → login/logout │
│       └─ "/protected" → ProtectedRoute ── useAuth() → role check   │
│                          allowedRoles={['admin','viewer']}        │
│                          └─ <Protected content/>                  │
└───────────────────────────────────────────────────────────────────┘
          ▲                                    │
          └──── getUser() / login() ◄──────────┘   api/auth.ts (backend)
```

**The point of the video in one sentence:** whatever UI you choose (spinner, redirect, error page), **handle all three states**: user, not logged in, and still checking.

---

## 💭 My thoughts: what's good to know beyond the video

### 1. Frontend checks are UX, not security ⚠️

**The most important point for interviews.** Anyone can open DevTools, change `role` to `'admin'` in React state, or call your API with Postman. **Hiding a page only hides the UI.**

```
Browser (React)                     Server (API)
┌──────────────────────┐           ┌──────────────────────────────┐
│ ProtectedRoute       │  request  │ ★ checks token + role AGAIN  │
│ hides the admin page │ ────────► │   on EVERY request           │
│ (convenience only)   │           │   403 Forbidden if not allowed│
└──────────────────────┘           └──────────────────────────────┘
```

**Rule:** the backend is the real gatekeeper. The frontend just avoids showing buttons that would fail anyway.

### 2. Redirect instead of "Permission denied"

In a real app with React Router, send logged-out users to the login page and remember where they wanted to go:

```tsx
const location = useLocation()   // from react-router-dom

if (currentUser === null) {
  return <Navigate to="/login" replace state={{ from: location }} />
}
if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
  return <Navigate to="/403" replace />
}
```

- **Not logged in** → `/login` (then go back to `from` after login).
- **Logged in, wrong role** → a "403 / not allowed" page, **not** the login page.

### 3. Use it as a layout route (protect many pages at once)

Instead of wrapping every page, use `<Outlet />`:

```tsx
function ProtectedRoute({ allowedRoles }: { allowedRoles?: User['role'][] }) {
  // ...same checks...
  return <Outlet />
}

// router
{ element: <ProtectedRoute allowedRoles={['admin']} />, children: [
  { path: '/admin/users', element: <Users /> },
  { path: '/admin/billing', element: <Billing /> },
]}
```

### 4. Check **permissions**, not just roles

`role === 'admin'` checks spread everywhere and become hard to change. Bigger apps map roles to **permissions** and check those:

```ts
type Role = 'admin' | 'viewer'
type Permission = 'users:read' | 'users:edit' | 'billing:read'

const PERMISSIONS: Record<Role, Permission[]> = {
  admin:  ['users:read', 'users:edit', 'billing:read'],
  viewer: ['users:read'],
}

function can(user: { role: Role }, permission: Permission) {
  return PERMISSIONS[user.role].includes(permission)
}

{can(currentUser, 'users:edit') && <button>Edit</button>}   // hide single buttons too
```

Adding a new role is then one line, not a search through the whole codebase. Even better, the **backend sends the permission list** with the user.

### 5. Where to keep the token

| Option | Risk |
|---|---|
| `localStorage` | Readable by any JavaScript, so an XSS bug can steal it |
| React state only | Lost on reload (that's why the video re-fetches on mount) |
| **`httpOnly` cookie** ✅ | JavaScript can't read it; the browser sends it automatically. Needs CSRF protection (`SameSite` cookies) |

A common production setup: an `httpOnly` refresh cookie, plus a short-lived access token in memory, and `GET /me` on page load (exactly Step 4).

### 6. Small improvements to the video's code

- **Memoise the context value** (`useMemo`, plus `useCallback` for the handlers), so every consumer doesn't re-render whenever the provider re-renders.
- **Don't keep two copies of "logged in":** `authToken` and `currentUser` can disagree. One `status` field is clearer:
  ```ts
  type AuthState =
    | { status: 'loading' }
    | { status: 'anonymous' }
    | { status: 'authenticated'; user: User }
  ```
  This is a **discriminated union**: TypeScript then forces you to handle every case (see the TypeScript coding section).
- **React Query / RTK Query** for `getUser` gives you caching, retries and refetch-on-focus for free.
- **Handle 401 globally:** if any API call returns 401 (session expired), log the user out in one place, such as an axios/fetch interceptor.
- **In Next.js / SSR**, check auth on the server (middleware or server components), so protected HTML is never sent and there's no loading flash.

---

## Cheat sheet

| Concept | One-liner |
|---|---|
| Authentication | *Who* are you? (login) |
| Authorization | *What* may you do? (role / permission) |
| Three states | `undefined` = loading, `null` = logged out, `User` = logged in |
| `AuthProvider` | Context that owns the user state + login/logout + check on mount |
| `useAuth()` | Custom hook; throws if used outside the provider |
| `ProtectedRoute` | Wrapper: loading → denied/redirect → children |
| `allowedRoles?` | Optional: no roles = login is enough |
| Single responsibility | Auth logic and route protection live in separate components |
| Real security | Always on the backend (401 / 403) |

---

## Interview Q&A

**Q: How do you implement role-based routes in React?**
An `AuthProvider` context holds the current user. A `ProtectedRoute` wrapper reads it with `useAuth()`, shows a loader while it's unknown, redirects if it's `null`, checks `allowedRoles.includes(user.role)`, and renders the children or `<Outlet />`.

**Q: Why does the user state have three values?**
To tell "still checking" apart from "not logged in". Without `undefined`, a page reload would briefly treat a logged-in user as logged out and redirect them to the login page.

**Q: Is hiding a route enough to secure it?**
No. Frontend code can be changed by the user. The API must check the token and the role on every request and return 401 or 403. The frontend check is only for a good user experience.

**Q: Why throw an error in `useAuth()`?**
If a component is rendered outside the provider, you get a clear error message right away, instead of `undefined` bugs later.

**Q: Roles or permissions?**
Roles are fine for small apps. For bigger ones, map roles to permissions (`users:edit`) and check permissions, so adding or changing a role doesn't mean editing checks all over the code.

**Q: What's the difference between 401 and 403?**
**401 Unauthorized**: we don't know who you are (not logged in, or the token expired), so send the user to login. **403 Forbidden**: we know who you are, but you're not allowed, so show a "no access" page.

---

## 🎯 Interview answer

> "I split it into two responsibilities. An `AuthProvider` context owns authentication: it checks the session on mount with a `/me` call, exposes login and logout, and models the user as three states: `undefined` while loading, `null` when logged out, and a `User` when logged in. A `useAuth` hook reads it and throws if it's used outside the provider. Then a `ProtectedRoute` layout route handles authorization: it shows a loader while the state is unknown, redirects to login if there's no user, sends a wrong-role user to a 403 page, and otherwise renders the outlet. For bigger apps I'd check permissions rather than raw roles, keep the token in an httpOnly cookie, and handle 401s globally. Most importantly, the frontend check is only UX: the backend must enforce the same rules on every request."
