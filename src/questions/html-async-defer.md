## Short answer

**By default, a `<script>` stops HTML parsing** while it downloads and runs, so the page appears more slowly.

| | Downloads | Runs | Order kept? | Use for |
|---|---|---|---|---|
| `<script>` (normal) | **blocks** parsing | immediately, **blocks** parsing | ✅ | rarely: only tiny scripts that must run first |
| `<script async>` | in parallel | **as soon as it's downloaded** (pauses parsing then) | ❌ any order | independent scripts: **analytics, ads** |
| `<script defer>` | in parallel | **after the HTML is parsed**, before `DOMContentLoaded` | ✅ in order | ⭐ **your app's scripts** |
| `<script type="module">` | in parallel | **deferred by default** | ✅ | modern ES module code |

**Analogy: reading a recipe while shopping** 🛒

- **Normal:** you stop reading, go to the shop, cook the ingredient, and only then continue reading.
- **`async`:** someone shops for you while you keep reading, but the moment they're back, you stop and cook it, whatever order they arrive in.
- **`defer`:** someone shops for you, and you cook everything **in order**, after you've finished reading the whole recipe.

---

## Timeline

```
Normal <script>:
HTML parsing ████░░░░░░░░░░░░████████   (stops while downloading + running)
Download         ▓▓▓▓▓▓
Run                    ██

async:
HTML parsing ██████████░░░████████       (pauses only to run)
Download     ▓▓▓▓▓▓▓
Run                    ███

defer:
HTML parsing █████████████████████
Download     ▓▓▓▓▓▓▓
Run                               ███    (after parsing, in order)
```

---

## In code

```html
<head>
  <!-- ⭐ app code: downloads early, runs after the HTML, in order -->
  <script src="vendor.js" defer></script>
  <script src="app.js" defer></script>      <!-- runs after vendor.js ✅ -->

  <!-- independent third-party script: order doesn't matter -->
  <script src="https://analytics.example.com/a.js" async></script>

  <!-- ES modules are deferred automatically -->
  <script type="module" src="main.js"></script>
</head>
```

**The old trick:** put `<script>` tags just before `</body>`, so the HTML is parsed first. `defer` in `<head>` is better: the download starts **earlier**, in parallel with parsing.

---

## Which one to choose?

```
Does the script need the DOM, or other scripts, in a set order?   → defer (or type="module")
Is it independent (analytics, ads, chat widgets)?                 → async
Must it run before anything renders (tiny theme/flash fix)?       → small inline <script> in <head>
```

**⚠️ `async` pitfall:** if `app.js` uses a library loaded with `async`, it might run **before** the library has loaded: "jQuery is not defined". Use `defer` for scripts that depend on each other.

---

## CSS blocks rendering too

- **CSS is render-blocking:** the browser won't paint until the stylesheets in `<head>` are loaded (otherwise you'd see unstyled content flash).
- **Keep critical CSS small**, and inline the above-the-fold CSS for very fast pages.

### Resource hints

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />       <!-- connect early -->
<link rel="preload" href="/hero.webp" as="image" />                  <!-- this page needs it soon -->
<link rel="prefetch" href="/next-page.js" />                         <!-- maybe needed later -->
```

### `DOMContentLoaded` vs `load`

| Event | Fires when |
|---|---|
| `DOMContentLoaded` | The HTML is parsed and **deferred scripts have run** (images may still be loading) |
| `load` | **Everything** has loaded: images, styles, iframes |

---

## Quick Q&A

**Q: `async` vs `defer`?**
Both download in parallel without blocking parsing. `async` runs as soon as it's downloaded, in any order; `defer` runs after the HTML is fully parsed, in document order, before DOMContentLoaded.

**Q: Which should you use for your app's main script?**
`defer` (or `type="module"`, which is deferred by default), because it needs the DOM and keeps order.

**Q: Why were scripts placed at the end of `<body>`?**
So HTML parsing wasn't blocked. `defer` in the head achieves that while starting the download sooner.

**Q: Does `async` or `defer` work on inline scripts?**
No. They only apply to external scripts with `src` (except modules).

---

## 🎯 Interview answer

> "A normal script tag blocks HTML parsing while it downloads and executes. Both `async` and `defer` download the script in parallel with parsing. With `async`, the script runs as soon as it finishes downloading, pausing the parser at that moment, and multiple async scripts can run in any order, so it suits independent scripts like analytics. With `defer`, scripts run only after the whole document is parsed, in the order they appear, just before DOMContentLoaded, which is what I use for application code that touches the DOM or depends on other scripts. Module scripts are deferred by default. Putting deferred scripts in the head is better than the old end-of-body trick, because the download starts earlier. CSS is also render-blocking, so I keep it lean and use preload or preconnect for critical resources."
