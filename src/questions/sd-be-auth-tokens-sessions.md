## Quick answer

**Setup:** a React app on AWS CloudFront, a NestJS backend in Kubernetes pods, and Microsoft SSO with RBAC.

- **Access token (JWT):** short-lived (about 15 min) and sent on **every** request. The server checks only its **signature**, with no DB lookup, so it's **fast** ⚡. It **can't be revoked**.
- **Refresh token:** long-lived (8–12 h) and sent **only** to `/refresh`. The server looks it up in the **DB/Redis**, so it **can be revoked**, rotated and capped 🔒.
- **Rotation + reuse detection:** every refresh token works **once**. If an old one comes back, someone copied it, so the server revokes that whole login.
- **Absolute lifetime:** set **once at login** and never extended, so a session (or an attacker) can't refresh forever.
- **Storage:** access token in **memory**, refresh token in an **httpOnly cookie**. That needs the **same site**, so route `/api` through CloudFront.
- **Stateful alternative:** a Redis session with a random ID. No refresh token is needed, and logout is instant.

> 💡 **One line to remember:** the access token is for **speed**, the refresh token is for **control**.

---

### 🗺️ How to read the diagrams

The design is built up **one piece at a time**:

```
┌────────────┐
│  Existing  │   single line  = already there from an earlier step
└────────────┘

╔════════════╗
║ ★ NEW      ║   double line + ★ = added in THIS step
╚════════════╝

──────►   request / data flow
═════►    NEW flow added in this step
```

---

## 1. The Setup: Why Kubernetes Matters for Auth

Your backend isn't one server. It's **many pods**, and any request can land on **any** pod.

```
┌─────────┐     ┌────────────┐     ┌──────────────┐     ┌─────────┐
│ Browser │────►│ CloudFront │────►│ ALB/Ingress  │──┬─►│ Pod 1   │
│ (React) │     │ (S3 React) │     │              │  ├─►│ Pod 2   │
└─────────┘     └────────────┘     └──────────────┘  └─►│ Pod 3   │
                                                        └─────────┘
                                         pods scale up/down anytime
```

| Option | What happens in K8s |
|---|---|
| In-memory session (express-session default) | ❌ Pod 1 knows you, Pod 2 doesn't, so you get logged out at random |
| Session in **shared Redis** | ✅ Works. Every pod reads the same store (stateful) |
| **JWT** (signed token) | ✅ Works. Any pod verifies the signature, no shared store (stateless) |

> 💡 Both Redis sessions and JWT work. Steps 2–9 explain the **JWT way**, and step 12 the **Redis way**.

---

## 2. Step ①: The Access Token (JWT)

```
┌─────────┐   1. login (Microsoft SSO)          ┌──────────┐
│ Browser │════════════════════════════════════►│ NestJS   │
│         │◄════ ★ access token (JWT, 15 min) ══│  pod     │
│         │                                     │          │
│         │── 2. GET /api/orders ──────────────►│ ★ verify │
│         │   Authorization: Bearer eyJ...      │ signature│
│         │◄── 200 ─────────────────────────────│ no DB ⚡ │
└─────────┘                                     └──────────┘
```

| What's new | Why |
|---|---|
| ★ JWT access token | It carries the user id + roles, **signed** by the server/Microsoft |
| ★ Signature check | Any pod can verify it with the key, **no DB lookup** |

**Isn't verifying slow?** No:

```
1st request  → download Microsoft's public keys (JWKS) once (~200 ms) → cache in memory
every other  → key from cache → verify signature (~0.05 ms CPU) → read roles from token
               total < 1 ms
```

- Keep `cache: true` in `jwks-rsa`.
- Use **App Roles**, so the roles are inside the token.
- **Don't** call the DB or Microsoft Graph on every request.

> ⚠️ **The catch:** the server never looks the token up, so it **can't cancel it**. A stolen access token works until it expires. That's why it's kept **short (15 min)**.

---

## 3. Step ②: Why Not Renew the Access Token With Itself?

The idea: *"When my access token is about to expire, I'll send it and get a new one."*

```
🦹 Attacker steals access token
   10:14 → /renew → new token
   10:28 → /renew → new token
   ...   → forever ♾️     ← the 15-min expiry means nothing now
```

The server can't tell the attacker from you, and it has **nothing in the DB to delete**. So we need a second token that the server **does** track.

---

## 4. Step ③: Add the Refresh Token

```
┌─────────┐                                     ┌──────────┐     ╔══════════════╗
│ Browser │── login ───────────────────────────►│ NestJS   │════►║ ★ DB / Redis ║
│         │◄── access (15 min)                  │          │     ║ refresh token║
│         │◄══ ★ refresh token (12 h) ══════════│          │     ║ records      ║
│         │                                     │          │     ╚══════════════╝
│         │── GET /api/orders (access) ────────►│ sig only │
│         │                                     │          │
│         │══ ★ POST /refresh (refresh) ═══════►│ ★ DB     │
│         │◄══ new access token ════════════════│  lookup  │
└─────────┘                                     └──────────┘
```

| | Access token | ★ Refresh token |
|---|---|---|
| Lifetime | Short (5–15 min) | Long (8–12 h) |
| Sent on | **Every** request | **Only** `/refresh` |
| Checked by | Signature (no DB) ⚡ | **DB/Redis lookup** |
| Revocable? | ❌ | ✅ delete it |

> 💡 Every refresh is a **checkpoint** where the server asks: *still allowed? not revoked? not past the deadline? user not disabled?* Without a refresh token, the server never gets to ask.

---

## 5. Step ④: The Refresh Flow, and When You See the Microsoft Login

```
API call ──► 200 ✅ done
    │
    └─► 401 (access expired)
           │
           ▼
     ★ POST /user/token/refresh
           │
           ├─ 200 ✅ ──► new access token ──► retry the request (user notices nothing)
           │
           └─ 401 ❌ ──► ★ redirect to Microsoft login
                            │
                            ├─ Microsoft still remembers you? ──► auto back (quick flash)
                            └─ no ──► type password + MFA 🔑
```

**Why redirect?** There are only **two** ways to get an access token:

1. Show a valid **refresh token**
2. **Prove who you are** (log in)

The frontend can't make its own token, because it doesn't have the signing key. So once the refresh token is dead, logging in is the only option left.

| Scenario | Access | Refresh | What the user sees |
|---|---|---|---|
| First visit | ❌ | ❌ | 🔑 Microsoft login |
| Normal use | ✅ | ✅ | Nothing |
| Every 15 min / back from lunch | ❌ | ✅ | Nothing (silent refresh) |
| Next day (refresh expired) | ❌ | ❌ | Quick Microsoft flash (MS remembers you) |
| New browser / after logout | ❌ | ❌ | 🔑 Microsoft login |
| Admin disabled you / password changed | ❌ | ❌ revoked | ⛔ blocked / 🔑 new password |

**The axios interceptor that does it:**

```js
let refreshPromise = null                       // only ONE refresh at a time

function refresh() {
  if (!refreshPromise) {
    refreshPromise = axios.post('/api/user/token/refresh')
      .then((r) => { setToken(r.data.accessToken); return r.data.accessToken })
      .finally(() => (refreshPromise = null))
  }
  return refreshPromise
}

api.interceptors.response.use(null, async (err) => {
  if (err.response?.status === 401 && !err.config._retry) {
    err.config._retry = true
    try {
      await refresh()
      return api(err.config)                    // retry the original request
    } catch {
      window.location.href = '/api/auth/login'  // → Microsoft
    }
  }
  return Promise.reject(err)
})
```

---

## 6. Step ⑤: Rotation + Reuse Detection (Catching a Thief)

**Think of each refresh token as a one-time coupon.**

```
Login → R1 → R2 → R3 → R4 ...     ← one "family" (one login)
        each one works ONCE, then it's marked "used"
```

**The attack:**

```
10:00  🦹 steals R1          You: R1    Attacker: R1 (copy)
10:05  🦹 uses R1 → gets R2  (R1 marked USED)
10:15  You use R1 → ★ "R1 already used!" 🚨
       → two people have the same coupon → someone copied it
       → ★ revoke the WHOLE family (R2 dies too)

You:      logged out → Microsoft login → new family ✅
Attacker: R2 dead → can't log in (no Microsoft password) ❌
```

> 🎟️ It's like two people holding a copy of the same movie ticket. The second scan says **"already used"**, so security cancels the booking. You show your ID and get a new ticket, and the thief can't.

---

## 7. Step ⑥: How the Server Stores It (One Row per Login)

You **don't** need to keep every old token. Keep **one row per family**, and put the family id **inside** the token: `F1.x8Kd9aPq...`

```
╔═══════════════════════════ ★ token_families ════════════════════════════════╗
║ familyId │ userId │ currentHash │ previousHash │ rotatedAt │ expires │ device ║
║ F1 (rand)│ indhu  │ hash(R4)    │ hash(R3)     │ 10:15:00  │ 13:00   │ Chrome ║
║ F2 (rand)│ indhu  │ hash(P9)    │ hash(P8)     │ 10:10:00  │ 20:00   │ Phone  ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

```
Incoming "F1.xxxx" → find row F1
   ├─ matches currentHash                 → ✅ rotate (previous = current, current = new)
   ├─ matches previousHash, < 10 s ago    → ✅ multi-tab race, allow (step 8)
   └─ anything else                       → 🚨 stolen → revoke F1
```

| Rule | Why |
|---|---|
| Store the **hash**, never the raw token | A DB leak doesn't hand out working tokens |
| **familyId = random, made by the server** at every login | A fresh start after each login, and the client can't influence it |
| deviceId / user agent / IP = **extra columns** | For a "Your devices" page + anomaly detection (a client-sent deviceId can be faked) |
| Redis key with a TTL at `expires` | Expired sessions clean themselves up |

**Devices:** each device or browser login is its **own family**. A theft on Chrome revokes only Chrome, and your phone stays logged in. "Log out all devices" or a password change deletes every family.

---

## 8. Step ⑦: The Multi-Tab Trap

Tabs in the same browser **share one cookie**, so they share one refresh token:

```
Tab 1: R1 → OK → R2
Tab 2: R1 → "already used!" 🚨 → logged out 😡   ← FALSE alarm, it's just you
```

| Fix | Where |
|---|---|
| ★ **Grace period**: old token reused within ~10 s → allow, don't revoke | Backend |
| ★ **One refresh at a time** (shared promise, `navigator.locks` across tabs) | Frontend |

Keep the grace period **short**, because an attacker inside the window also gets through.

---

## 9. Step ⑧: TTLs (Why It Doesn't Refresh Forever)

**The question:** *"The token expires at 13:00. I refresh at 12:00, so does it extend to 17:00? Then it never ends!"*

```
❌ WRONG: reset on every refresh (sliding)
08:00 login → expires 13:00
12:00 refresh → expires 17:00 → 16:00 refresh → 21:00 ... ♾️

✅ RIGHT: deadline fixed at LOGIN (absolute)
08:00 login → ★ expires 13:00
12:00 refresh → new token, STILL 13:00
13:00 refresh → ❌ 401 → Microsoft login
```

```ts
// login:    expiresAt = Date.now() + 5 * HOUR      (calculated ONCE)
// refresh:  expiresAt = oldToken.expiresAt         (copied, never reset)
```

> 💡 Refreshing gives you a **new token**, not **more time**.

**Two clocks:**

| Clock | Resets on refresh? | Example | Purpose |
|---|---|---|---|
| Idle timeout | ✅ Yes | 1–8 h | Log out people who walked away |
| **Absolute lifetime** | ❌ Never | 12 h from login | Hard stop |

**Typical values:**

| App | Access | Absolute refresh |
|---|---|---|
| Banking | 5 min | 8–12 h |
| **Enterprise + Microsoft SSO** | **15 min** | **8–24 h** (one workday) |
| SaaS dashboard | 15 min | 14–30 days |
| Mobile / social | 15–60 min | 30–90 days |

Enforce it in the **DB/Redis record**. The cookie `maxAge` is only a convenience.

---

## 10. Step ⑨: What If the Attacker Steals the Refresh Token?

```
10:00  You: R4                                  Row F1: current = R4
10:02  🦹 copies R4
10:05  🦹 R4 → R5                               Row F1: current = R5, previous = R4
10:05–10:15  🦹 acts as you
10:15  You send R4 → ≠ current, too old → 🚨 revoke F1
       You → Microsoft → new family ✅
10:15–10:20  🦹 last access token still valid (≤ 15 min)
10:20  🦹 fully out ❌
```

| Situation | Attacker lasts |
|---|---|
| You're actively using the app | Until your next refresh + ≤ 15 min |
| You log out / change password / admin revokes | Instant + ≤ 15 min (last access token) |
| ⚠️ You're offline (laptop closed) | Until the **absolute deadline**, because nobody reuses the old token, so there's no alarm |
| ⚠️ The XSS is still on the page | It steals the new tokens again after re-login, so **fix the XSS** |
| Sensitive action (change password/payment) | ❌ blocked by **step-up MFA** |

**Logging in again on your own doesn't kick the attacker out.** It just creates a *new* family. **Reuse detection** (or "log out all devices") is what kills the stolen one.

---

## 11. Step ⑩: Microsoft SSO + RBAC

```
╔═════════════════╗      login (Auth Code + PKCE, MFA, Conditional Access)
║ ★ Microsoft     ║◄═══════════════════════════════════════════┐
║   Entra ID      ║                                             │
║ App Roles:      ║                                       ┌─────────┐
║ Admin / Viewer  ║                                       │ React   │
╚═════════════════╝                                       └─────────┘
        │ token: { "roles": ["Admin"], ... }                    │ Bearer
        ▼                                                       ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ NestJS: verify via MS JWKS (iss, aud, exp) → ★ RolesGuard        │
   │ @Roles('Admin') on routes                                        │
   └─────────────────────────────────────────────────────────────────┘
```

**Who handles refresh?** There are three common setups:

| Setup | Refresh goes to | Rotation/reuse handled by | Next Microsoft login when |
|---|---|---|---|
| MSAL in the browser | Microsoft directly | Microsoft | SPA refresh token fixed at 24 h |
| **A**: backend refreshes the MS tokens | Your `/user/token/refresh` → Microsoft | Microsoft | Conditional Access "sign-in frequency", 90 days idle, revoke |
| **B**: backend issues its **own** tokens | Your `/user/token/refresh` → your DB | **You** (steps 6–9) | Your absolute lifetime ends |

**How to tell A from B:** decode the token at jwt.ms. If `iss` is `login.microsoftonline.com`, it's A. If it's your own value, it's B.

> ⚠️ **Variant B gap:** disabling a user in Azure doesn't end your own session, so keep the absolute lifetime short.

---

## 12. Step ⑪: Where to Store Tokens in the Browser

| Where | Survives reload? | XSS can steal? | Verdict |
|---|---|---|---|
| **Memory** (JS variable) | ❌ | Harder (only while the page is open) | ⭐ access token |
| **httpOnly cookie** | ✅ | ❌ JS can't read it | ⭐ refresh token (same-site only) |
| sessionStorage | ✅ (per tab) | ✅ | 👍 compromise (MSAL default) |
| localStorage | ✅ (forever) | ✅ | ❌ avoid for refresh tokens |

**Best combo:** access token in memory + refresh token in an httpOnly cookie. On reload, memory is empty, so the app calls `/refresh` at startup, the cookie is sent automatically, and it's silent.

**"Lots of apps use localStorage!"** True, it's simple. It's acceptable-ish with short access tokens, no refresh token in it, and a strict CSP. Avoid it for sensitive apps.

**Can another site read my localStorage?** ❌ **No.** The Same-Origin Policy prevents it, from any tab or iframe. What *can* read it:

- XSS on **your** site
- Third-party scripts **you** include
- Browser extensions
- Malware

> 💡 If you have XSS, no storage is fully safe. Storage choice only limits **how long** and **from where** an attacker can use the token. The real fix is **CSP + sanitizing + auditing dependencies**.

---

## 13. Step ⑫: Different Domains for Frontend and Backend

```
app.myapp.com + api.myapp.com        → SAME-SITE   ✅ cookies OK (SameSite=Lax) + CORS
myapp.com     + myapi.com            → CROSS-SITE  ⚠️ cookie = third-party, Safari blocks it
*.cloudfront.net + *.amazonaws.com   → CROSS-SITE  ⚠️ (each subdomain is its own site)
```

**⭐ Best fix: proxy the API through the same CloudFront:**

```
                    ┌────────────┐──── /*     ──► S3 (React)
Browser ──► myapp.com│ CloudFront │
                    └────────────┘════ ★ /api/* ══► ALB / Ingress (NestJS)
                         cache: CachingDisabled
                         origin request: AllViewerExceptHostHeader
```

| What's new | Why |
|---|---|
| ★ `/api/*` behavior → backend origin | The browser sees **one domain**, so cookies are first-party, `SameSite=Strict` works, and there's **no CORS** |
| `app.setGlobalPrefix('api')` | NestJS routes match `/api/...` |
| Secret origin header / WAF | Only CloudFront can reach the backend |

**If you really must keep two domains:**

- Use bearer tokens only: access in memory, refresh in **sessionStorage**, sent in the **body** to `/refresh`.
- Set `enableCors({ origin: 'https://myapp.com', credentials: false })`.
- Or just let **MSAL** manage the tokens in the browser.
- **Two tokens don't prevent theft here.** XSS can read either one. Your protection comes from **rotation + reuse detection + short lifetimes + CSP**.

---

## 14. Step ⑬: Stateful Alternative (Redis Sessions)

```
┌─────────┐  cookie: session_id=sess_8f3k2   ┌──────────┐     ╔═══════════════════════╗
│ Browser │─────────────────────────────────►│ any pod  │════►║ ★ Redis               ║
└─────────┘  (random ID, no data inside)     └──────────┘     ║ sess_8f3k2 → {user,   ║
                                                              ║   roles, createdAt}   ║
                                                              ║ TTL = idle timeout    ║
                                                              ╚═══════════════════════╝
```

- **Every** request looks up the session (~1 ms).
- **No refresh token needed**, because the server checks on every call anyway.
- Logout, ban or role change takes effect **instantly** (delete or update the key).
- Store `createdAt` and reject after 12 h. That's the **absolute limit**, because each request slides the idle TTL.
- **Different domain?** Still stateful: send the random **opaque token** as `Authorization: Bearer`. Stateful means "the server stores the session", not "uses cookies".
- **Mobile:** works fine with a bearer header, and Keychain/Keystore is safer than browser storage.
- **Microservices:** check the session **once at the gateway**, then pass a short-lived internal JWT inward. Don't make every service hit Redis.

| | Redis session (stateful) | JWT + refresh (stateless) |
|---|---|---|
| Logout / ban | ✅ Instant | ⚠️ ≤ access TTL |
| Code | ✅ Simple | ❌ Rotation, families, grace period |
| Per-request cost | Redis lookup | ⚡ None |
| Redis down | ❌ App down | ✅ Still works until refresh |
| Mobile / microservices / cross-domain | ✅ Via bearer / gateway | ✅ Natural fit |

---

## 15. Final Design (Production)

```
                          ┌──────────────────────────┐
                          │ Microsoft Entra ID       │
                          │ SSO · MFA · App Roles    │
                          └────────────▲─────────────┘
                                       │ OIDC (Auth Code + PKCE)
┌───────────┐   https://myapp.com      │
│ React app │──► CloudFront + WAF ─────┤
│           │     ├─ /*     → S3       │
│ access    │     └─ /api/* → ALB/Ingress → NestJS pods
│ token in  │                               │  ├─ verify JWT (cached JWKS) or session
│ memory    │                               │  ├─ RolesGuard (@Roles)
│           │                               │  └─ /user/token/refresh
│ refresh / │                               ▼
│ session = │                        Redis (ElastiCache)
│ httpOnly  │                        token families / sessions
│ cookie    │                        rotation · reuse detection · absolute TTL
└───────────┘
```

**Checklist:**

- ✅ One domain via CloudFront → httpOnly, Secure, `SameSite=Strict` cookie, no CORS
- ✅ Access token 15 min (memory), refresh absolute 12 h, idle 8 h
- ✅ Rotation + reuse detection + 10 s grace, one row per login family
- ✅ JWKS cached, roles from the token, `RolesGuard` on every route
- ✅ Logout = revoke family; password change / admin = revoke all
- ✅ Step-up MFA for sensitive actions, anomaly detection (new IP/device)
- ✅ Secrets in K8s Secrets / Secrets Manager, rate limit `/auth/*`, strict CSP

---

## 16. Cheat Sheet

| Question | Answer in one line |
|---|---|
| Why JWT in K8s? | Any pod verifies it, no shared session store needed |
| Is JWT verification slow? | No: cached JWKS + local signature check, < 1 ms |
| Why a refresh token? | Access tokens can't be revoked; refresh gives the server a checkpoint |
| Why not renew the access token with itself? | A stolen one would live forever |
| When does the Microsoft login appear? | When `/refresh` fails (expired, revoked, missing) |
| Does rotation refresh forever? | No: the absolute deadline is set at login and copied, never extended |
| How is theft detected? | One-time tokens; an old one reused → revoke the family |
| Multiple devices? | One family per login, and they don't affect each other |
| Multiple tabs? | Grace period + one refresh at a time |
| Where to store tokens? | Access in memory, refresh in an httpOnly cookie |
| Can other sites read my localStorage? | No, the Same-Origin Policy. XSS on *your* site can |
| Different domains? | Proxy `/api` via CloudFront, otherwise bearer + sessionStorage + rotation |
| Stateful vs stateless? | Redis = instant control, simple; JWT = no lookup, multi-client |

---

## 17. Interview Q&A

**Q: Which auth would you choose for a CloudFront frontend and a NestJS backend on Kubernetes?**
Microsoft or Cognito SSO through OIDC. I'd route `/api` through the same CloudFront so cookies are first-party. Then either Redis sessions (simplest, instant revoke) or a 15-minute JWT in memory with a rotating refresh token in an httpOnly cookie, with an absolute lifetime and reuse detection.

**Q: Why can't the access token renew itself?**
Access tokens are stateless and never looked up, so a stolen one could keep renewing forever. The refresh token is stored server-side, so every refresh is a checkpoint where the server can end the session.

**Q: What happens if an attacker steals the refresh token?**
Each refresh token is single-use. When the real user's client sends the already-used token, the server knows it was copied and revokes the whole family. The attacker keeps only their last access token, for at most 15 minutes. The worst case is that the user is offline, so the absolute lifetime caps it. Sensitive actions also require step-up MFA.

**Q: Why not just log in again after the theft?**
A new login creates a new family and leaves the stolen one alive, because users can have many sessions. Reuse detection, or "log out all devices", is what kills the stolen family.

**Q: How do you stop refresh rotation from extending a session forever?**
The absolute expiry is calculated once at login and copied onto every rotated token. Refreshing gives a new token, not more time.

**Q: Isn't localStorage fine? Lots of apps use it.**
It's simple and works cross-domain, but any XSS can read the token and send it away. Another *site* can't read it, thanks to the Same-Origin Policy. I'd keep access tokens in memory and refresh tokens in httpOnly cookies. If localStorage is used: short-lived tokens, no refresh token there, and a strict CSP.

**Q: Redis sessions or JWT?**
For a browser app on one domain, Redis sessions: simple, instant revocation, and nothing for XSS to steal. For mobile, third-party clients or many microservices, JWT, or sessions checked at the gateway with internal JWTs passed inward.
