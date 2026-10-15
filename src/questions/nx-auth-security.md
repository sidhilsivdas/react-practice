## Quick answer

**Authentication in the App Router is layered.** Following the official Next.js guide:

1. **Login and sign-up** via **Server Actions** (validate with zod, hash passwords) or an auth library (Auth.js, Clerk, Better Auth, Auth0, Supabase…).
2. **Sessions** in an **HttpOnly, Secure, SameSite** cookie: either a signed/encrypted token (stateless, e.g. with `jose`) or a session ID backed by a database.
3. **Authorisation in a Data Access Layer (DAL):** a `server-only` module with `verifySession()` (wrapped in `React.cache`), checked **close to the data** in Server Components, **every Server Action** and **every Route Handler**, returning minimal **DTOs**.
4. **Optional optimistic checks in Proxy:** a fast redirect if there's no session cookie. **Never the only check.**

---

## Authentication vs authorisation

| Term | Question | In Next.js |
|---|---|---|
| **Authentication** | Who are you? | Login form → Server Action → verify credentials → create a session |
| **Session management** | Are you still logged in? | A cookie (HttpOnly, Secure, SameSite=Lax, an expiry), refreshed on activity, deleted on logout |
| **Authorisation** | Are you allowed to do **this**, on **this** resource? | DAL checks: role, ownership, plan |

---

## Sessions

```ts
// lib/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const key = new TextEncoder().encode(process.env.SESSION_SECRET)   // openssl rand -base64 32

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await new SignJWT({ userId })                       // minimal payload: no PII
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)

  ;(await cookies()).set('session', token, {
    httpOnly: true,       // JavaScript can't read it, so XSS can't steal it
    secure: true,         // HTTPS only
    sameSite: 'lax',      // not sent on cross-site POSTs (CSRF protection)
    expires: expiresAt,
    path: '/',
  })
}

export async function decrypt(token?: string) {
  try {
    const { payload } = await jwtVerify(token ?? '', key, { algorithms: ['HS256'] })
    return payload as { userId: string }
  } catch {
    return null
  }
}
```

| | **Stateless** (signed token in a cookie) | **Database sessions** (session ID in a cookie) |
|---|---|---|
| Lookup per request | None: verify the signature | A database (or Redis) read |
| Revoke a session immediately ("log out all devices") | ❌ hard (wait for expiry, or keep a denylist) | ✅ delete the row |
| Scale | Easy | Needs a fast session store |
| Typical use | Simple apps, short expiry | Banking, admin tools, account security features |

**Cookies are set only in Server Actions and Route Handlers**, never during render.

---

## Data Access Layer

**The centre of the architecture:** all data access goes through one audited, server-only layer.

```ts
// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from './session'

export const verifySession = cache(async () => {        // memoised per render pass
  const session = await decrypt((await cookies()).get('session')?.value)
  if (!session?.userId) redirect('/login')
  return { userId: session.userId }
})

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession()
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },     // a DTO: never the password hash or tokens
  })
})

export async function getInvoice(invoiceId: string) {
  const user = await getCurrentUser()
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice || (invoice.ownerId !== user?.id && user?.role !== 'admin')) return null   // ownership check
  return { id: invoice.id, total: invoice.total, status: invoice.status }               // a DTO
}
```

**Where to check:**

| Place | Check | Notes |
|---|---|---|
| **Proxy** (optional) | Optimistic: does a session cookie exist? Redirect to `/login` | Fast, and runs on every route **including prefetches**: no database calls |
| **Pages / Server Components** | `await verifySession()`, role-based rendering | Close to the data or UI that needs it |
| **Server Actions** | **Always** verify the session + authorise the resource | Each action is a public POST endpoint |
| **Route Handlers** | **Always**: 401 if not logged in, 403 if not allowed | Public HTTP endpoints |
| **Layouts** | ⚠️ **Not as the security check** | Layouts **don't re-render on client navigation**, and **don't stop** child pages or Server Actions from running |

**`React.cache` deduplicates only within one render pass.** In Server Actions and Route Handlers it doesn't memoise, so every call runs.

**Static routes:** pages prerendered at build time are shared by all users, so a DAL check at request time doesn't apply to them. Protect them in Proxy, or make them dynamic.

---

## Using auth in the UI

```tsx
// app/dashboard/page.tsx
export default async function Dashboard() {
  const user = await getCurrentUser()
  return (
    <>
      <h1>Welcome, {user?.name}</h1>
      {user?.role === 'admin' && <AdminPanel />}      {/* UI hiding is NOT security on its own */}
    </>
  )
}
```

- **Client Components can't import the DAL.** Fetch the user in a Server Component and pass **minimal props**, or provide it through a context provider.
- **Don't block the whole shell on the session:** put the user menu in its own Server Component behind `<Suspense>`, so the rest of the page streams first.
- **Hiding a button isn't authorisation.** The Server Action behind it must check again.
- `forbidden()` / `unauthorized()` (rendering `forbidden.tsx` / `unauthorized.tsx` with 403/401) **are still experimental** (`experimental.authInterrupts`).

---

## Security checklist

| Risk | Next.js measure |
|---|---|
| **Secret leakage** | Only `NEXT_PUBLIC_*` env vars reach the browser, and they're **inlined at build time**, so never put secrets there. Use `import 'server-only'` for modules with secrets. Only the DAL reads `process.env`. |
| **Over-fetching to the client** | DTOs with selected fields; React's taint APIs (`experimental.taint` + `taintObjectReference` / `taintUniqueValue`) as an extra layer |
| **Unauthenticated / IDOR access** | Session + ownership checks in **every** Action and Route Handler |
| **Input tampering** | Validate `params`, `searchParams`, form data and JSON bodies with zod. Bracket folders are user input. |
| **CSRF** | Server Actions: POST + an Origin/Host check; `SameSite=Lax` cookies; CSRF tokens for custom Route Handlers using cookies |
| **XSS** | React escapes by default; avoid `dangerouslySetInnerHTML` (or sanitise with DOMPurify); **CSP with nonces** (generated in Proxy) |
| **Side effects during render** | Don't delete cookies or mutate in render (Next.js blocks setting cookies there); use Actions |
| **Security headers** | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`, via `headers()` in `next.config` or Proxy |
| **Abuse** | Rate limiting for login, sign-up and expensive actions; CAPTCHA where needed |
| **Dependency vulnerabilities** | Keep `next`, `react` and `react-dom` patched (see below); `npm audit`, Renovate |

---

## Real Next.js vulnerabilities

**Interviewers increasingly ask about these. They show why defence in depth matters:**

| CVE | What | Lesson |
|---|---|---|
| **CVE-2025-29927** (Mar 2025, CVSS 9.1) | **Middleware bypass:** a spoofed `x-middleware-subrequest` header made Next.js skip middleware. Apps with auth **only** in middleware were exposed (mainly self-hosted). Fixed in 12.3.5 / 13.5.9 / 14.2.25 / 15.2.3. | Don't rely on one layer: check auth near the data |
| **CVE-2025-55182 "React2Shell"** (Dec 2025, CVSS 10.0) | **Unauthenticated remote code execution** in React Server Components: unsafe deserialisation of requests to Server Function endpoints. Affected React 19.0–19.2.0 and frameworks including **Next.js** (tracked there as **CVE-2025-66478**), React Router, Waku and Vite RSC. Public exploits appeared within a day; follow-up advisories required patching again. | **Patch quickly** and follow official advisories; even apps without their own Server Actions were exposed if they supported RSC. WAF rules are only a partial mitigation. |

---

## Interview Q&A

**Q: How do you implement authentication in an App Router app?**
Login via a Server Action or an auth library, a session in an HttpOnly/Secure/SameSite cookie (a signed JWT or a database session), a server-only DAL with a cached `verifySession()` that is checked in Server Components, every Server Action and every Route Handler, DTOs for returned data, and optional optimistic redirects in Proxy.

**Q: Why not just protect routes in middleware/Proxy?**
Proxy doesn't cover every entry point well, should stay fast (no database checks), and was bypassable in CVE-2025-29927. Authorisation must happen close to the data, in every Action and Route Handler.

**Q: Why are layouts a bad place for auth checks?**
They don't re-render on client navigation, and they don't prevent nested pages or Server Actions from executing.

**Q: Where should secrets live?**
In server-only environment variables, read only in the server-side data layer. Never in `NEXT_PUBLIC_` variables, which are inlined into the client bundle at build time.

**Q: Stateless vs database sessions?**
Stateless signed cookies need no lookup but are hard to revoke. Database sessions cost a lookup but can be revoked instantly and support features like "log out all devices".

---

## 🎯 Interview answer

> "I follow a layered model. Login and sign-up go through Server Actions with zod validation and password hashing, or an auth library like Auth.js or Clerk. The session lives in an HttpOnly, Secure, SameSite=Lax cookie, either a signed JWT made with `jose` or a database session ID when I need instant revocation. Authorisation lives in a server-only data access layer: a `verifySession` wrapped in `React.cache`, and data functions that check ownership or role and return minimal DTOs. That layer is called from Server Components and, critically, from every Server Action and Route Handler, because each is a public endpoint. Proxy only does optimistic redirects based on the cookie, with no database calls, since it runs on prefetches too. I don't use layouts as security checks, because they don't re-render on navigation or stop nested segments and actions. Secrets stay in server-only env vars, never `NEXT_PUBLIC_`, modules are guarded with `server-only`, and I validate params and inputs, add CSP and security headers, and rate-limit sensitive actions. The real CVEs make the case: CVE-2025-29927 let attackers skip middleware with a spoofed header, and React2Shell, CVE-2025-55182, was a critical RCE in Server Components, so we check auth near the data and patch Next.js and React promptly."
