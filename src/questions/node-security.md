## Short answer

**The most important Node.js API security practices:**

1. **Validate all input** (body, query, params, headers).
2. **Prevent injection:** parameterised queries, no user input in shell commands.
3. **Authentication and authorization done right:** hashed passwords, safe tokens, and permission checks on **every** request.
4. **Keep secrets out of code:** environment variables or a secrets manager.
5. **Security headers** (`helmet`), **CORS** limited to your domains, **HTTPS**.
6. **Rate limiting** against brute force and abuse.
7. **Up-to-date dependencies** (`npm audit`).
8. **Don't leak error details or stack traces.**
9. **Limit request sizes** and avoid blocking work (DoS).

---

## Input validation

**Never trust anything from the client.** Validate shape, types and limits:

```js
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  age: z.number().int().min(13).optional(),
})

app.post('/users', (req, res, next) => {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ errors: result.error.flatten() })

  createUser(result.data)        // ✅ only validated, known fields
    .then((user) => res.status(201).json(user))
    .catch(next)
})
```

**Also prevents mass assignment:** `User.create(req.body)` could let a user send `{ "role": "admin" }`. Only use **validated fields**.

---

## Injection attacks

### SQL injection

```js
// ❌ input: ' OR '1'='1  → returns every user
db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`)

// ✅ parameterised query: input is always treated as data, never as SQL
db.query('SELECT * FROM users WHERE email = $1', [req.body.email])
```

### NoSQL injection (MongoDB)

```js
// ❌ body: { "email": { "$ne": null }, "password": { "$ne": null } } → logs in as the first user!
User.findOne({ email: req.body.email, password: req.body.password })

// ✅ validate types (must be strings), or sanitise operators
const email = String(req.body.email)
```

### Command injection

```js
exec(`ping ${req.query.host}`)              // ❌ host = "x; rm -rf /"
execFile('ping', ['-c', '1', req.query.host]) // ✅ no shell, arguments aren't interpreted
```

### Path traversal

```js
// ❌ file = "../../etc/passwd"
res.sendFile(path.join(__dirname, 'uploads', req.query.file))

// ✅ check that the resolved path stays inside the folder
const base = path.resolve(__dirname, 'uploads')
const target = path.resolve(base, req.query.file)
if (!target.startsWith(base + path.sep)) return res.status(400).send('Invalid file')
res.sendFile(target)
```

---

## Auth done right

```js
import bcrypt from 'bcrypt'

const hash = await bcrypt.hash(password, 12)          // ✅ slow, salted hash (or argon2)
const ok = await bcrypt.compare(attempt, hash)        // never store plain passwords or MD5/SHA1
```

| Practice | Why |
|---|---|
| **bcrypt / argon2** for passwords | Slow on purpose, so stolen hashes are hard to crack |
| **Short-lived access tokens + refresh tokens** | Limits damage if a token is stolen (see the Auth flow question) |
| **`HttpOnly`, `Secure`, `SameSite` cookies** | JavaScript can't read them (XSS), and they aren't sent cross-site (CSRF) |
| **Verify the JWT signature and the expected algorithm** | `jwt.verify(token, secret, { algorithms: ['HS256'] })` |
| **Check permissions on every request** | Can **this** user access **this** record? (IDOR: changing `/orders/123` to `/orders/124`) |
| **Generic login errors** | "Invalid email or password", which doesn't reveal which accounts exist |

---

## Headers, CORS, limits

```js
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

app.use(helmet())                               // security headers: CSP, HSTS, no-sniff, frame options...
app.disable('x-powered-by')                     // don't advertise Express (helmet also does this)

app.use(cors({
  origin: ['https://myapp.com'],                // ❌ never '*' together with credentials
  credentials: true,
}))

app.use(express.json({ limit: '100kb' }))       // reject huge bodies (DoS)

app.use('/auth/login', rateLimit({              // stop password brute-forcing
  windowMs: 15 * 60 * 1000,
  max: 10,
}))
```

**Behind a proxy or load balancer**, set `app.set('trust proxy', 1)` so the rate limiter sees the real client IP.

---

## Secrets & config

```js
// ❌ in the code / git history forever
const JWT_SECRET = 'supersecret123'

// ✅ from the environment
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET is required')
```

- **Use `.env` files only locally**, and add them to `.gitignore`. Node 20.6+ can load them natively: `node --env-file=.env app.js`.
- **In production, use the platform's secrets** (AWS Secrets Manager, Vault, Kubernetes Secrets).
- **Rotate a secret immediately** if it ever reaches git, because git history keeps it.
- **Don't log secrets, tokens or passwords.**

---

## Errors, DoS & dependencies

- **Never send stack traces to clients.** Log them server-side, and send a generic message.
- **Set `NODE_ENV=production`**: Express then hides error details and runs faster.
- **Avoid ReDoS:** user input against complex regexes can block the event loop. Limit input length and use safe patterns.
- **Timeouts** on outgoing requests and DB queries.
- **Dependencies:** `npm audit`, Dependabot or Renovate, a committed lock file, `npm ci`.
- **Run as a non-root user** in containers.
- **Node's permission model** (`--permission`, stable in recent versions) can restrict file system, child process and worker access.

---

## OWASP mapping

| OWASP Top 10 risk | Node practice |
|---|---|
| Broken access control | Check ownership and roles on every request |
| Injection | Parameterised queries, `execFile`, schema validation |
| Cryptographic failures | bcrypt/argon2, HTTPS, no secrets in code |
| Security misconfiguration | helmet, strict CORS, `NODE_ENV=production`, no stack traces |
| Vulnerable components | npm audit, updates, fewer dependencies |
| Authentication failures | Rate limiting, secure tokens and cookies, MFA |

---

## Quick Q&A

**Q: How do you prevent SQL injection in Node?**
Use parameterised queries or prepared statements (or an ORM that uses them), never string concatenation, and validate input.

**Q: How should passwords be stored?**
Hashed with a slow, salted algorithm like bcrypt or argon2, never in plain text or with fast hashes like MD5 or SHA-1.

**Q: What does helmet do?**
Sets security-related HTTP headers like Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options and frame protection.

**Q: How do you handle secrets?**
Environment variables or a secrets manager, never committed to git, validated at startup, never logged.

**Q: Why rate limiting?**
To slow down brute-force login attempts, credential stuffing and API abuse.

**Q: What is mass assignment?**
Saving `req.body` directly, so attackers can set fields they shouldn't, like `role` or `isAdmin`. Whitelist and validate fields.

---

## 🎯 Interview answer

> "I treat all client input as untrusted and validate it with a schema library like zod, which also prevents mass assignment because only known fields reach the database. I prevent injection with parameterised queries for SQL, type checks for MongoDB operators, `execFile` instead of `exec` for shell commands, and resolving and checking file paths against traversal. Passwords are hashed with bcrypt or argon2, tokens are short-lived and stored in HttpOnly, Secure, SameSite cookies, and every request checks authorization on the specific resource, not just authentication. I add helmet for security headers, restrict CORS to known origins, limit body size, rate-limit login endpoints, and run with `NODE_ENV=production` without leaking stack traces. Secrets come from environment variables or a secrets manager, never git, and dependencies are kept patched with npm audit, Dependabot and a committed lock file installed with `npm ci`."
