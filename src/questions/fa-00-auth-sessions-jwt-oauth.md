## Short answer

**Sessions, JWTs and OAuth are not three answers to the same question.** They solve different parts of the auth puzzle:

| Technology | What it really is | The question it answers |
|---|---|---|
| **Sessions** | Login state stored **on the server**; the browser only holds an ID in a cookie | "Is this browser logged in?" |
| **JWT** | A **token format**: signed claims the client carries around | "Can I trust this request without asking a database?" |
| **OAuth 2.0** | An **authorization framework** (delegated access) | "May app A use the user's data in service B?" |
| **OpenID Connect (OIDC)** | An **identity layer on top of OAuth 2.0** | "Who is this user?" (*Sign in with Google*) |

**The default the video recommends:** for a normal server-rendered web app, **start with server-side sessions + secure cookies**. Use JWTs only when their trade-offs fit your architecture.

**Analogy: a hotel** 🏨
- **Session** = the front desk keeps your booking in **its own computer** and gives you a room number. Every time, the desk looks you up. Easy to cancel: delete the booking.
- **JWT** = a **signed wristband** with your name, room and checkout date printed on it. Any staff member can check it without calling the desk, but if it's stolen, it works until checkout unless the hotel keeps a "banned wristbands" list.
- **OAuth** = you give the cleaning company a **key card that only opens your room** for today, instead of giving them your master key (your password).
- **OIDC** = the hotel accepts your **passport from another country** (Google) to prove who you are.

> 📺 Notes from the video **"Stop Choosing JWT by Default! Sessions vs JWT vs OAuth Explained"** by Time To Program, plus extra notes of mine marked **💭 My thoughts**. Related pages: **"Role-based authentication & protected routes"** (the React side: `AuthProvider` + `ProtectedRoute`) and, for a full production design (refresh token rotation, Redis sessions, Microsoft SSO), the System Design → Backend page **"Auth for React + NestJS on Kubernetes"**.

---

## Step 0: authentication vs authorization

```
╔═════════════════ ★ Authentication ═════════════════╗
║  "WHO are you?"                                    ║
║  log in with email + password → identity verified  ║
╚════════════════════════════════════════════════════╝
╔═════════════════ ★ Authorization ══════════════════╗
║  "WHAT are you allowed to do?"                     ║
║  user → own profile only   admin → manage all users║
╚════════════════════════════════════════════════════╝
```

| Technology | Mainly about |
|---|---|
| Sessions, JWTs | **Keeping** (or carrying) the logged-in state after authentication |
| OAuth 2.0 | **Authorization**: limited access to resources **without** the user's password |
| OpenID Connect | **Authentication** through an identity provider (Google, Microsoft…), built on OAuth 2.0 |

**Remember this split.** Most of the confusion comes from treating OAuth as a login protocol.

---

## Step 1: sessions (state lives on the server)

```
 Browser                                   Server
┌──────────┐ ① POST /login (email, pw)  ┌───────────────────────────────┐
│          │ ─────────────────────────► │ ② verify, ★ create session    │
│          │                            │   ╔═════ Session store ═════╗ │
│          │ ③ Set-Cookie:              │   ║ abc123 → { userId: 42 } ║ │
│ 🍪 abc123│ ◄───────────────────────── │   ║ (DB / Redis)            ║ │
│          │   sessionId=abc123         │   ╚═════════════════════════╝ │
│          │ ④ GET /profile             │                               │
│          │   Cookie: sessionId=abc123 │ look up abc123 → user 42 ✅    │
│          │ ─────────────────────────► │                               │
└──────────┘                            └───────────────────────────────┘
   holds only the ID                       holds the real data
```

**The 4 steps:** ① user sends credentials → ② server verifies and creates a session → ③ server sends the session ID in a cookie → ④ browser sends the cookie on every request; server looks the session up.

| ✅ Pros | ❌ Cons |
|---|---|
| **Simple**: one lookup per request | Needs a **session store** |
| **Easy to revoke**: delete the session (e.g. "log out my lost laptop") | **Multiple servers** must share that store (e.g. Redis), which is extra infrastructure, but a well-known solution |
| Fits **server-rendered** web apps naturally | A **stolen cookie** lets an attacker act as the user |

**Production cookie settings:**

```
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax
```

| Setting / practice | Protects against |
|---|---|
| `HttpOnly` | JavaScript (and so XSS) can't read the cookie |
| `Secure` + HTTPS | Cookie only sent over encrypted connections |
| `SameSite` | Limits sending the cookie from other sites (CSRF) |
| **Rotate the session ID** after login / role change | Session fixation (attacker plants a known ID before you log in) |
| **CSRF defenses** | Other sites triggering requests that carry your cookie automatically |

> **Sessions are not outdated.** They're still an excellent choice for many apps.

---

## Step 2: JWTs (state lives in a signed token)

A JWT has **3 parts**, base64url-encoded and joined by dots: `xxxxx.yyyyy.zzzzz`

```
   xxxxx              .        yyyyy                 .     zzzzz
╔═ ★ Header ════════╗   ╔═ ★ Payload (claims) ══╗   ╔═ ★ Signature ═════════╗
║ { "alg": "HS256", ║   ║ { "sub": "42",        ║   ║ sign(header.payload,  ║
║   "typ": "JWT" }  ║   ║   "iss": "my-api",    ║   ║      secret/key)      ║
║ type + algorithm  ║   ║   "exp": 1735689600,  ║   ║ proves: not changed + ║
╚═══════════════════╝   ║   "role": "admin" }   ║   ║ from a trusted signer ║
                        ╚═══════════════════════╝   ╚═══════════════════════╝
```

⚠️ **A normal signed JWT is NOT encrypted.** Anyone holding it can decode the header and payload (try pasting one into jwt.io). **Never** put passwords, API keys or sensitive personal data in it.

**How JWT auth works (e.g. a mobile app + API):**

```
 Mobile app                                  API
┌────────────┐ ① login (credentials)      ┌────────────────────────────────┐
│            │ ──────────────────────────►│ ② verify → ★ issue access token│
│ secure     │ ◄──────────────────────────│   (maybe a JWT)                │
│ storage 🔐 │ ③ GET /orders              │ ④ validate:                    │
│            │  Authorization:            │   ✓ signature                  │
│            │   Bearer <access token>    │   ✓ iss (issuer)               │
│            │ ──────────────────────────►│   ✓ aud (audience)             │
│            │                            │   ✓ exp (not expired)          │
│            │                            │   ✓ permissions                │
└────────────┘                            │   ★ no session lookup needed   │
                                          └────────────────────────────────┘
```

| ✅ Why developers use JWTs | ❌ Downsides |
|---|---|
| A service can validate it **without a DB lookup** on every request | **Revocation is hard**: logging out deletes the client's copy, not a **stolen** copy. It works until `exp` |
| Useful when **many services** must verify the same token | Fixing that needs a **denylist / token version**, which brings server state back |
| Carries **standard claims** (`sub`, `iss`, `aud`, `exp`) | **Storage**: in `localStorage`, any XSS can read it. In a cookie, you need CSRF protection again |
| | It's **just a format**: it doesn't give you login, logout, refresh, password reset or authorization |

**The usual fix for revocation:** **short-lived access tokens** (minutes) + a **refresh token**. Refresh tokens need their own protection: secure storage, **rotation**, and **reuse detection**.

> **Don't assume JWTs = faster or more scalable.** They save a session lookup, but signature checks, key management, revocation and authorization checks still cost something.

---

## Step 3: OAuth 2.0 (delegated authorization)

**OAuth is not "the Continue with Google button".** It's for letting one app access **another service's resources** for a user, **without the user's password**.

**Example:** your calendar app wants to read the user's **Google Calendar**.

```
 User       Your calendar app            Google (authorization server)   Google Calendar API
  │                │                                  │                           │
  │  "connect"     │ ① redirect to Google ──────────► │                           │
  │ ──────────────►│                                  │ ② user signs in at Google │
  │                │                                  │   and reviews permissions │
  │ ◄──────────────────────── ③ "Allow: read calendar?" ✅                        │
  │                │ ◄─── ④ ★ access token (scope: calendar.read) ─               │
  │                │ ⑤ GET /events  Bearer <token> ──────────────────────────────►│
  │                │ ◄────────────────────────────────── events (read-only) ──────│
```

| What's new | Why |
|---|---|
| **No password shared** | Your app never sees or stores the Google password |
| **Scopes** (`calendar.read`) | The token gives **limited** access, not full account access |
| **Access token** | Meant for **calling APIs**, *not* proof of who the user is |

**Authorization Code flow + PKCE:** the standard flow for modern web, mobile and native apps.
- **Public clients** (browser SPAs, mobile apps) can't keep a secret, so they **must use PKCE** (Proof Key for Code Exchange). It stops an attacker who intercepts the authorization code from using it.
- **Confidential clients** (servers) keep a **client secret** safely on the server.
- Always: **HTTPS**, exact **redirect URIs**, and validate protocol parameters (e.g. `state`).

---

## Step 4: OpenID Connect (identity on top of OAuth)

```
        ╔════════════════════════════════╗
        ║ ★ OpenID Connect  (identity)   ║  → ID token: "this is user X"
        ╠════════════════════════════════╣
        ║   OAuth 2.0  (authorization)   ║  → access token: "may call API Y"
        ╚════════════════════════════════╝
```

| Token | For | Who reads it |
|---|---|---|
| **Access token** (OAuth) | Accessing protected resources (APIs) | The **API / resource server** |
| **ID token** (OIDC) | Telling the app **who logged in** | The **client app** it was issued for |

**For "Sign in with Google", use OpenID Connect**, not plain OAuth. Treating an OAuth access token as proof of identity is a known security mistake.

---

## Step 5: compare them with 4 questions

| Question | Sessions | JWT | OAuth |
|---|---|---|---|
| **1. Where is the state?** | On the **server**; browser keeps a session ID | **Client** holds the token; server validates signed claims, no lookup | **Authorization server** issues tokens (JWTs **or** opaque strings) |
| **2. Logout / revocation?** | **Easy**: delete the session | **Hard**: needs extra mechanisms; short `exp` only limits the damage | Depends on provider; refresh tokens can often be revoked, issued access tokens may live until expiry |
| **3. Scaling?** | Shared session store (e.g. Redis) | Convenient across services that trust the same issuer & keys | Built for delegation between clients, auth servers and resource servers |
| **4. Use when…** | Conventional web app, simple central login state | Many services must validate tokens, and you can manage expiry, keys & revocation | One app needs access to **another service's** resources |

**Key takeaway:** sessions and JWTs are **alternatives** for holding login state. OAuth solves **delegated authorization**. OIDC adds **login** on top of OAuth. **They can work together.**

---

## Step 6: decision guide (4 scenarios)

```
                       What are you building?
                                │
   ┌──────────────────┬─────────┴──────────┬───────────────────────┐
   ▼                  ▼                    ▼                       ▼
 ① Server-rendered  ② Mobile app        ③ Many backend          ④ "Sign in with
   web app             + API               services                 Google"
   │                  │                    │                       │
 ★ Sessions +       ★ Short access      ★ JWT access tokens     ★ OpenID Connect
   secure cookies     token + refresh     from a trusted auth      then your OWN
                      token (JWT or       server; each service     session (web)
                      opaque)             validates + authorizes   or tokens (mobile)
```

**① Traditional web app** (dashboard, e-commerce, SaaS rendered by your backend)
→ **Server-side sessions + secure cookies.** Easy to understand and revoke. HTTPS, secure cookie attributes, **regenerate the session ID after login**, CSRF defenses, invalidate on logout.

**② Mobile app calling an API**
→ Short-lived **access token** + **refresh token**. JWT is **one option, not required**: **opaque tokens** work well when the API wants central control (token **introspection**). Store long-lived credentials in the **OS secure storage** (Keychain / Keystore). **Never put a client secret in a mobile app**: it can be extracted.

**③ Multiple backend services** (API gateway, orders, payments, reporting)
→ JWT access tokens from a **trusted authorization server**. Each service validates **signature, issuer, audience, expiry, scopes**. ⚠️ Don't blindly forward the same token to every service: tokens should be meant for the service that receives them (`aud`), and **each service enforces its own authorization**. Service-to-service: OAuth **client credentials** flow, or workload identity. *The choice depends on trust boundaries and infrastructure, not just the number of services.*

**④ Login with Google**
→ **OpenID Connect.** Validate the ID token (signature, `iss`, `aud`, time claims). Then **create your own login state**: a server-side session for a website, a token-based session for a mobile app.

```
 Google ──OIDC──► your backend ──► ★ creates YOUR session ──► 🍪 browser
 (identity)       validates ID token   (sessions handle access to your app)
```

---

## Step 7: five common mistakes

| # | Mistake | Reality |
|---|---|---|
| 1 | "JWTs are more secure than sessions" | Security depends on **storage, expiry, keys, revocation**. JWTs aren't automatically safer |
| 2 | "The JWT payload is secret" | A signed JWT is **readable** by anyone who has it |
| 3 | Using an **OAuth access token as login proof** | Use **OpenID Connect** for authentication |
| 4 | Forgetting token theft on **logout** | Deleting the client copy doesn't kill a **stolen** copy. Plan expiry, revocation, refresh rotation |
| 5 | Storing credentials carelessly | Protect cookies, keep bearer tokens away from unneeded JS, use secure storage. **XSS ≠ CSRF**: different defenses |

**Bonus rule:** **don't build your own crypto or auth protocol.** Use mature frameworks, trusted identity providers and established libraries.

---

## Final picture

```
┌──────────────────────────── a typical modern setup ────────────────────────────┐
│                                                                                │
│  User ──"Sign in with Google"──► Google  ══ OpenID Connect (who?) ══╗          │
│                                                                     ▼          │
│                                                      ┌──── Your backend ────┐  │
│  Browser 🍪 ◄═══ Session cookie (HttpOnly, Secure) ══│ session store (Redis) │  │
│  Mobile 🔐  ◄═══ access token + refresh token ══════│                       │  │
│                                                      └──────────┬───────────┘  │
│                                                                 │ OAuth 2.0    │
│                                                                 ▼ (what?)      │
│                                              Google Calendar API (scoped token)│
└────────────────────────────────────────────────────────────────────────────────┘
   OIDC = login   ·   Sessions / tokens = stay logged in   ·   OAuth = access other APIs
```

**The point of the video in one sentence:** the best auth design isn't the most fashionable one; it's the one that **solves your actual problem with the least complexity** while meeting your security needs.

---

## 💭 My thoughts: what's good to know beyond the video

### 1. What this means for a React SPA

The video focuses on server-rendered apps and mobile. For a **React SPA**, the commonly recommended setup today is the **BFF (Backend-for-Frontend)** pattern:

```
 React SPA ──🍪 HttpOnly session cookie──► BFF (your server) ──Bearer token──► APIs
            (no tokens in JS at all)        holds the OAuth/OIDC tokens
```

- The browser never sees access or refresh tokens, so **XSS can't steal them**.
- This is basically **sessions for the browser, tokens between servers**: the video's "they work together" idea.
- If you must keep tokens in the SPA: access token **in memory** (not `localStorage`), refresh token in an **HttpOnly cookie**, and Authorization Code + **PKCE** (never the old *implicit flow*).

### 2. Opaque token vs JWT in one line

- **Opaque token** = a random string; the API must **ask** the auth server what it means (introspection). Easy to revoke, but one network call per check (usually cached).
- **JWT** = **self-contained**; the API checks it **locally**. Fast, but hard to revoke.

### 3. JWT validation gotchas (interview favourites)

- Never accept `alg: "none"`, and **pin the expected algorithm** (don't trust the header's `alg`).
- Always check `exp`, `iss` **and `aud`**. Skipping `aud` lets a token made for service A be used at service B.
- Use asymmetric keys (**RS256 / ES256**) when many services verify tokens: they only need the **public key** (via the issuer's **JWKS** endpoint), so they can't create tokens.

### 4. XSS vs CSRF quick reminder

| | XSS | CSRF |
|---|---|---|
| Attack | Attacker's **script runs on your page** | **Another site** makes your browser send a request with your cookies |
| Steals | Anything JS can read (`localStorage` tokens) | Nothing; it **uses** your cookie without reading it |
| Defense | Escape output, CSP, `HttpOnly` cookies | `SameSite` cookies, CSRF tokens, check `Origin` |

---

## Cheat sheet

| Concept | One-liner |
|---|---|
| Authentication | *Who* are you? |
| Authorization | *What* may you do? |
| Session | Server stores state; browser holds an ID in a cookie |
| JWT | Signed (not encrypted) token: `header.payload.signature` |
| JWT revocation | Hard: short expiry + refresh tokens, or a denylist |
| OAuth 2.0 | Delegated, scoped access to **another** service, no password shared |
| OpenID Connect | Login/identity layer on top of OAuth 2.0 → ID token |
| Access token vs ID token | API access vs "who logged in" |
| PKCE | Required for public clients (SPAs, mobile) in the Authorization Code flow |
| Opaque token | Random string, checked by asking the auth server |
| Default for web apps | Sessions + `HttpOnly; Secure; SameSite` cookies |
| Golden rule | Don't roll your own crypto/auth protocol |

---

## Interview Q&A

**Q: Sessions or JWT, which is better?**
Neither in general. Sessions are simpler and easy to revoke, so they're a great default for server-rendered web apps. JWTs help when many services need to verify identity without a shared lookup, but they make logout and revocation harder.

**Q: Why is logging out hard with JWTs?**
The server doesn't keep a record of issued JWTs, so deleting the token on the client doesn't invalidate a stolen copy. It stays valid until `exp`. Fixes: short-lived access tokens with refresh token rotation, or a denylist/token version, which adds server state back.

**Q: Is the JWT payload secure?**
It's protected from **changes** (signature), not from **reading**. A signed JWT is only base64url-encoded, so never put secrets in it.

**Q: What's the difference between OAuth and OpenID Connect?**
OAuth 2.0 is authorization: it gives an app scoped access to resources (access token). OpenID Connect sits on top and adds authentication: it tells the app who the user is (ID token). For "Sign in with Google", use OIDC.

**Q: What is PKCE and why is it needed?**
Proof Key for Code Exchange. The client creates a secret `code_verifier`, sends its hash with the authorization request, and proves it knows the original when exchanging the code. An attacker who steals the authorization code can't use it. It's required for public clients like SPAs and mobile apps that can't keep a client secret.

**Q: Where should a web app store tokens?**
Best: not in the browser at all (BFF pattern with an HttpOnly session cookie). Otherwise: access token in memory and refresh token in an `HttpOnly; Secure; SameSite` cookie. Avoid `localStorage`, because any XSS can read it.

**Q: Opaque token vs JWT?**
An opaque token is a random reference the API must look up (introspection), so it's easy to revoke. A JWT is self-contained and checked locally, so it's fast but hard to revoke.

---

## 🎯 Interview answer

> "Sessions, JWTs and OAuth solve different problems. Sessions and JWTs are two ways to keep a user logged in: a session stores the state on the server and gives the browser an ID in an HttpOnly, Secure, SameSite cookie, which makes logout and revocation easy. A JWT is a signed but readable token that services can verify without a lookup, which helps in distributed systems, but revocation is hard, so you pair short-lived access tokens with rotated refresh tokens. OAuth 2.0 is delegated authorization, letting my app call another service's API with a scoped token and no password, using the Authorization Code flow with PKCE. For login through Google or Microsoft I'd use OpenID Connect, which adds an ID token on top of OAuth. My default for a web app is OIDC for login, then a server-side session cookie for the browser, and tokens only between servers."
