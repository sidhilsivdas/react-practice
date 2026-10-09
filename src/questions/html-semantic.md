## Short answer

**Semantic HTML means using tags that describe their meaning**, not just how they look: `<header>`, `<nav>`, `<main>`, `<article>`, `<button>`, instead of a `<div>` for everything.

**Why it matters:**

- **Accessibility:** screen readers announce "navigation", "main content" and "button", and users can jump between them.
- **SEO:** search engines understand which part is the real content.
- **Readable code:** `<nav>` is clearer than `<div class="nav">`.
- **Free behaviour:** a `<button>` is focusable and works with Enter and Space automatically.

**Analogy: a newspaper** 📰 It has a masthead (header), sections, articles with headlines, and a footer. Semantic tags give your page the same clear structure, so anyone (or any machine) can find their way around.

---

## Page structure

```html
<body>
  <header>
    <a href="/" class="logo">MyShop</a>
    <nav aria-label="Main">
      <ul>
        <li><a href="/products">Products</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <main>                                  <!-- only ONE main per page -->
    <article>
      <h1>How to choose running shoes</h1>
      <p>Published <time datetime="2026-10-08">8 October 2026</time></p>
      <section>
        <h2>Fit</h2>
        <p>...</p>
      </section>
      <figure>
        <img src="shoes.jpg" alt="Three running shoes side by side" />
        <figcaption>Road, trail and racing shoes</figcaption>
      </figure>
    </article>

    <aside>Related articles</aside>
  </main>

  <footer>© 2026 MyShop</footer>
</body>
```

| Tag | Use for |
|---|---|
| `<header>` | Intro of the page or a section (logo, title, nav) |
| `<nav>` | Major navigation links |
| `<main>` | The main, unique content (**once per page**) |
| `<article>` | Self-contained content that makes sense on its own: blog post, product card, comment |
| `<section>` | A themed group of content, **usually with a heading** |
| `<aside>` | Related but secondary content: sidebar, ads, related links |
| `<footer>` | Footer of the page or a section |
| `<figure>` / `<figcaption>` | Image, chart or code with a caption |
| `<time datetime>` | Dates and times, machine-readable |
| `<mark>`, `<strong>`, `<em>` | Highlight, importance, emphasis (`<b>` and `<i>` are just visual) |

**`<div>` and `<span>` are fine** when no semantic tag fits (layout wrappers). Just don't use them **instead of** a meaningful tag.

---

## Div soup vs semantic

```html
<!-- ❌ div soup -->
<div class="header"><div class="nav">...</div></div>
<div class="button" onclick="save()">Save</div>     <!-- not focusable, no keyboard support -->

<!-- ✅ semantic -->
<header><nav>...</nav></header>
<button type="button" onclick="save()">Save</button>
```

**Rules of thumb:**

- **Clicking does something** → `<button>`.
- **Clicking goes somewhere** (a URL) → `<a href>`.
- **One `<h1>` per page**, and don't skip heading levels (h1 → h2 → h3). Headings make the page's **outline**.

---

## HTML5 features

**HTML5 (the modern HTML standard) added:**

| Feature | Example |
|---|---|
| Simple doctype | `<!DOCTYPE html>` |
| Semantic elements | `header`, `nav`, `main`, `article`, `section`, `aside`, `footer` |
| Media without plugins | `<video controls src="a.mp4">`, `<audio>` |
| Graphics | `<canvas>` (drawing with JS), inline `<svg>` |
| New input types | `email`, `tel`, `url`, `number`, `date`, `color`, `range`, `search` |
| Built-in form validation | `required`, `pattern`, `min`, `max`, `minlength` |
| Custom data | `data-*` attributes, read with `element.dataset` |
| Storage APIs | `localStorage`, `sessionStorage`, IndexedDB |
| Other APIs | Geolocation, drag and drop, Web Workers, WebSockets, History API |

```html
<form>
  <input type="email" name="email" required placeholder="you@example.com" />
  <input type="number" name="age" min="13" max="120" />
  <input type="text" name="zip" pattern="[0-9]{6}" title="6 digits" />
  <button type="submit">Sign up</button>      <!-- the browser validates before submitting -->
</form>

<div data-user-id="42" data-role="admin">Sam</div>
<script>
  const el = document.querySelector('[data-user-id]')
  el.dataset.userId   // "42"  (data-user-id → dataset.userId)
</script>
```

---

## The basics

```html
<!DOCTYPE html>                  <!-- standards mode (without it: "quirks mode") -->
<html lang="en">                 <!-- language: helps screen readers and translation -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />   <!-- needed for mobile -->
  <title>Running shoes guide | MyShop</title>
  <meta name="description" content="How to pick the right running shoes." />   <!-- search snippet -->
  <link rel="stylesheet" href="styles.css" />
  <script src="app.js" defer></script>
</head>
```

- **`<!DOCTYPE html>`** makes the browser use **standards mode**. Without it, old "quirks mode" rendering can break layouts.
- **The viewport meta tag** stops phones from showing a zoomed-out desktop page.

---

## SEO impact

**Search engines read your HTML like a document.** Semantic markup helps them understand **what the page is about and which parts matter**:

| Semantic choice | Direct SEO impact |
|---|---|
| **One `<h1>` + logical `<h2>`/`<h3>` outline** | Headings signal the topic and structure. The `<h1>` is a strong hint of what the page is about. |
| **`<main>`, `<article>`** | Helps separate the **main content** from navigation, ads and footers |
| **`<nav>` with real `<a href>` links** | Crawlers **follow `<a href>`**. A `<div onclick>` "link" is **not crawled** and passes no link value. |
| **Descriptive link text** | "Running shoes guide" tells search engines about the target page; "click here" tells them nothing |
| **`<img alt="...">`** | The image appears correctly in **image search**, and the alt text adds context to the page |
| **`<title>` + `<meta name="description">`** | The title is a key ranking and click signal; the description often becomes the **search snippet** |
| **`<time datetime>`, `<address>`, lists, tables** | Machine-readable dates, contact info and structured data |
| **Structured data (JSON-LD)** | Enables **rich results** (price, rating, stock, FAQs, breadcrumbs) |
| **Server-rendered HTML** | Content in the initial HTML is indexed reliably; content that only appears after client-side JavaScript may be indexed late or incompletely |
| **`lang` attribute, `hreflang`, canonical URL** | Right language and country versions; no duplicate-content dilution |

```html
<head>
  <title>Trail Runner 2 — Lightweight Running Shoes | MyShop</title>
  <meta name="description" content="Lightweight trail shoes with a grippy sole. Free delivery and 30-day returns." />
  <link rel="canonical" href="https://myshop.com/p/trail-runner-2" />
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Trail Runner 2",
      "image": "https://myshop.com/img/trail-runner-2.jpg",
      "offers": { "@type": "Offer", "price": "89.99", "priceCurrency": "GBP", "availability": "https://schema.org/InStock" }
    }
  </script>
</head>
```

**Honest note:** semantic tags alone don't make a page rank. Content quality and links matter most. But semantic HTML makes the content **understandable and crawlable**, it's the foundation of good **Core Web Vitals and accessibility** (which also affect search visibility), and it costs nothing.

---

## Accessibility & ARIA impact

**Screen readers build an "accessibility tree" from your HTML.** Semantic elements give it roles, names and states **for free**:

| HTML | What a screen reader user gets |
|---|---|
| `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` | **Landmarks**: jump straight to "main" or "navigation" with one key |
| `<h1>`–`<h6>` | **A list of headings to skim** (the most common way blind users scan a page) |
| `<button>` | Announced as "button", focusable, works with Enter and Space |
| `<a href>` | Announced as "link", in the links list |
| `<label for>` + `<input>` | The field's name is read when it's focused |
| `<ul>`/`<ol>` | "List, 5 items" |
| `<table>` + `<th>` | Row and column headers read with each cell |

**ARIA (Accessible Rich Internet Applications)** adds roles, states and properties **when HTML has no native element** for the widget:

```html
<!-- native first: no ARIA needed -->
<button type="button">Add to cart</button>

<!-- ARIA for things HTML can't express -->
<button aria-expanded="false" aria-controls="filters">Filters</button>   <!-- toggle state -->
<button aria-label="Close">✕</button>                                     <!-- name for an icon button -->
<div role="status" aria-live="polite">Added to cart</div>                <!-- announce updates -->
<nav aria-label="Breadcrumb">…</nav>                                      <!-- tell two navs apart -->
```

**The first rule of ARIA:** don't use ARIA if a native element can do the job. **"No ARIA is better than bad ARIA"**: a wrong `role` makes things worse. (See the **Accessibility basics** question for more.)

**Overlap:** most of what helps screen readers also helps search engines. Both are "users" that can't see the page and rely on structure, text alternatives and real links.

---

## Quick Q&A

**Q: What is semantic HTML? Why use it?**
Using elements that describe their meaning (`nav`, `main`, `article`, `button`). It improves accessibility, SEO and readability, and gives built-in behaviour like keyboard support.

**Q: `<section>` vs `<article>` vs `<div>`?**
`article` is self-contained content that could stand alone (a post or card); `section` is a themed group with a heading; `div` is a generic container with no meaning, for styling and layout.

**Q: `<b>` vs `<strong>`, `<i>` vs `<em>`?**
`strong` and `em` carry meaning (importance and emphasis, announced by screen readers). `b` and `i` are just visual styling.

**Q: What does `<!DOCTYPE html>` do?**
Tells the browser to render in standards mode instead of quirks mode.

**Q: What are `data-*` attributes?**
Custom attributes for storing extra data on elements, read in JS through `element.dataset`.

**Q: How does semantic HTML affect SEO?**
A clear heading outline, main and article landmarks, real crawlable `<a href>` links with descriptive text, alt text, a title and meta description, structured data and server-rendered HTML all help search engines understand and index the content. It's not a ranking trick by itself, but it's the foundation.

**Q: When do you need ARIA?**
Only when native HTML can't express something: states like `aria-expanded`, labels for icon-only buttons, live regions for announcements, or custom widgets. Native elements come first.

---

## 🎯 Interview answer

> "Semantic HTML means choosing elements by meaning rather than appearance: `header`, `nav`, `main`, `article`, `section`, `aside` and `footer` for structure, `button` for actions and `a` for navigation, and a proper heading hierarchy with one h1. It matters for accessibility, because screen readers expose landmarks and roles and native elements like buttons are focusable and keyboard-operable for free; for SEO, because search engines understand the content; and for maintainability. HTML5 standardised these semantic elements and also added native audio and video, canvas, new input types with built-in validation, `data-*` attributes, and APIs like localStorage, geolocation and the History API. I still use div and span, but only as neutral layout containers when no semantic element fits."
