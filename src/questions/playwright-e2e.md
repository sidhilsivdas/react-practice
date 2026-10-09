## Short answer

**Playwright is Microsoft's end-to-end (E2E) testing framework.** It drives **real browsers** (Chromium, Firefox and WebKit/Safari) like a user would (clicking, typing, navigating) and checks that whole user journeys work.

**Why teams choose it:**

- **Auto-waiting:** no `sleep(2000)`. It waits for elements to be ready.
- **Web-first assertions** that retry until they pass (or time out).
- **All 3 browser engines** plus mobile emulation.
- **Parallel by default**, and sharding in CI.
- **Debugging tools:** **UI mode**, **trace viewer** (a time-travel recording of a failed test), **codegen**.
- **Network mocking**, multiple tabs and users, API testing, visual comparisons, accessibility checks.
- **Recent additions:** ARIA snapshots, a Clock API, AI-assisted **test agents** (planner, generator, healer, since 1.56) and an MCP server.

**Analogy: a robot shopper** 🤖 Before every release, a robot opens your shop in Chrome, Firefox and Safari, searches for shoes, adds them to the cart and checks out, and tells you exactly where it got stuck.

---

## Where E2E fits

```
          ▲  few   E2E (Playwright)     whole journeys in a real browser: slow, most realistic
          │        Integration / component tests (Testing Library, Playwright CT)
          │  many  Unit tests (Vitest/Jest)  functions, hooks, mappers: fast
```

**Use E2E for critical journeys** (search → product → cart → checkout, login, account), not for every edge case. Edge cases belong in faster unit and component tests.

---

## Setup

```bash
npm init playwright@latest        # installs @playwright/test, browsers, example tests, config
npx playwright test               # run all tests (headless, parallel)
npx playwright test --ui          # ⭐ UI mode: watch, pick tests, time-travel debug
npx playwright test --debug       # step through with the inspector
npx playwright codegen localhost:3000   # record clicks → generates test code
npx playwright show-report        # HTML report
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,            // fail CI if someone left test.only
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',               // record a trace when a test is retried
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run start',   // test the production build
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Writing tests

```ts
// e2e/cart.spec.ts
import { test, expect } from '@playwright/test'

test('shopper can add a product to the cart', async ({ page }) => {
  await page.goto('/products/trail-runner')

  await page.getByRole('radio', { name: 'Size 42' }).check()
  await page.getByRole('button', { name: 'Add to cart' }).click()

  // web-first assertions: retried automatically until true (or timeout)
  await expect(page.getByRole('status')).toHaveText(/added to cart/i)
  await expect(page.getByRole('link', { name: /cart, 1 item/i })).toBeVisible()

  await page.getByRole('link', { name: /cart/i }).click()
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.getByRole('listitem')).toHaveCount(1)
})
```

### Locators: how to find elements

| Priority | Locator | Why |
|---|---|---|
| ⭐ 1 | `getByRole('button', { name: 'Add to cart' })` | How users **and screen readers** find things; resilient to markup changes |
| 2 | `getByLabel('Email')` | Form fields |
| 3 | `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle` | Visible text |
| 4 | `getByTestId('mini-cart')` | When there's no good accessible name (`data-testid`) |
| ❌ avoid | `page.locator('.btn-primary > span:nth-child(2)')` | Breaks when styling changes |

**Locators are lazy and auto-retrying.** They're found again at action time, so they survive re-renders.

### Common assertions

```ts
await expect(locator).toBeVisible()
await expect(locator).toHaveText('£49.99')
await expect(locator).toHaveCount(24)
await expect(locator).toBeEnabled()
await expect(page).toHaveURL(/checkout/)
await expect(page).toHaveTitle(/Trail Runner/)
await expect(locator).toMatchAriaSnapshot(`- button "Add to cart"`)   // accessibility-tree check
```

**❌ Never use fixed waits** (`page.waitForTimeout(3000)`). They're slow **and** flaky. Rely on auto-waiting and assertions.

---

## Page Object Model

**Keep selectors and flows in one place**, so tests read like user stories and are easy to update:

```ts
// e2e/pages/ProductPage.ts
import { type Page, expect } from '@playwright/test'

export class ProductPage {
  constructor(private page: Page) {}

  async open(slug: string) { await this.page.goto(`/products/${slug}`) }
  async chooseSize(size: string) { await this.page.getByRole('radio', { name: `Size ${size}` }).check() }
  async addToCart() {
    await this.page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(this.page.getByRole('status')).toHaveText(/added to cart/i)
  }
}
```

### Custom fixtures

**Share setup across tests:**

```ts
// e2e/fixtures.ts
import { test as base } from '@playwright/test'
import { ProductPage } from './pages/ProductPage'

export const test = base.extend<{ productPage: ProductPage }>({
  productPage: async ({ page }, use) => { await use(new ProductPage(page)) },
})
export { expect } from '@playwright/test'

// e2e/cart.spec.ts
import { test, expect } from './fixtures'

test('add to cart', async ({ productPage, page }) => {
  await productPage.open('trail-runner')
  await productPage.chooseSize('42')
  await productPage.addToCart()
  await expect(page.getByRole('link', { name: /cart, 1 item/i })).toBeVisible()
})
```

---

## Authentication

**Log in once, reuse the session:**

```ts
// e2e/auth.setup.ts: runs before the tests that need a logged-in user
import { test as setup, expect } from '@playwright/test'

setup('log in', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_USER!)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('link', { name: 'My account' })).toBeVisible()
  await page.context().storageState({ path: 'e2e/.auth/user.json' })   // save cookies + storage
})
```

```ts
// playwright.config.ts → projects
{ name: 'setup', testMatch: /auth\.setup\.ts/ },
{ name: 'chromium-logged-in', use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
  dependencies: ['setup'] },
```

---

## Mocking & API tests

```ts
// mock a slow or failing service to test error states
test('shows reviews fallback when reviews API fails', async ({ page }) => {
  await page.route('**/api/reviews/**', (route) => route.fulfill({ status: 500 }))
  await page.goto('/products/trail-runner')
  await expect(page.getByText('Reviews are unavailable right now')).toBeVisible()
})

// API testing with the built-in request fixture (no browser)
test('cart API rejects out-of-stock items', async ({ request }) => {
  const res = await request.post('/api/cart/items', { data: { sku: 'OUT-OF-STOCK', qty: 1 } })
  expect(res.status()).toBe(409)
})
```

---

## Visual & a11y tests

```ts
// visual regression: compares against a stored screenshot
await expect(page).toHaveScreenshot('product-page.png', { maxDiffPixelRatio: 0.01 })

// accessibility: fail on WCAG A/AA violations
import AxeBuilder from '@axe-core/playwright'
const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
expect(results.violations).toEqual([])
```

**Visual tests are sensitive to fonts and OS rendering.** Run them in one consistent environment (the CI Docker image).

---

## Running in CI

```yaml
# GitHub Actions
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --shard=${{ matrix.shard }}/4      # split across 4 machines
- uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with: { name: playwright-report-${{ matrix.shard }}, path: playwright-report/ }
```

**Best practices:**

- **Run against the PR's preview deployment** (or the production build), not the dev server.
- **Isolated test data:** each test creates what it needs (via the API), or uses seeded data. Tests must not depend on each other's order.
- **`trace: 'on-first-retry'`:** when a test flakes in CI, download the trace and replay it (`npx playwright show-trace trace.zip`) to see the DOM, network and console at each step.
- **Quarantine and fix flaky tests quickly.** Flaky suites lose the team's trust.
- **Use the third-party payment sandbox** (Stripe/Adyen test cards) for checkout tests.
- **The Clock API** (`page.clock`) controls time for countdowns and session-timeout tests.

---

## Playwright vs Cypress

| | **Playwright** | **Cypress** |
|---|---|---|
| Browsers | Chromium, Firefox, **WebKit (Safari)** | Chromium-family, Firefox (WebKit experimental) |
| Architecture | Controls the browser from outside (CDP and similar protocols) | Runs inside the browser |
| Multiple tabs, origins, users | ✅ easy | limited |
| Parallelism | built in, free | via its paid cloud or plugins |
| Languages | JS/TS, Python, Java, .NET | JS/TS |
| Debugging | UI mode, trace viewer | great interactive runner |
| Speed | generally faster | slower on large suites |

**Playwright has become the most common choice for new projects**, and the JD asks for it.

---

## Quick Q&A

**Q: Why Playwright?**
Real cross-browser testing including WebKit, auto-waiting and retrying assertions (fewer flaky tests), free parallelism and sharding, strong debugging with UI mode and traces, network mocking, and multi-tab/multi-user support.

**Q: How do you avoid flaky E2E tests?**
Role-based locators, web-first assertions instead of fixed waits, isolated test data, no dependency between tests, mocking unstable third parties, traces on retry to diagnose, and fixing or quarantining flaky tests quickly.

**Q: What should be covered by E2E vs unit tests?**
E2E covers critical user journeys end to end; unit and component tests cover logic and edge cases. Keep the E2E suite small and reliable.

**Q: How do you handle login in tests?**
A setup project logs in once and saves `storageState`; tests that need auth reuse it via project dependencies.

**Q: What is the trace viewer?**
A recording of a test run (actions, DOM snapshots, network, console) you can step through to see exactly why a test failed, especially in CI.

---

## 🎯 Interview answer

> "I use Playwright for end-to-end tests of the critical journeys (search, product page, add to cart, checkout, login), while logic and edge cases live in faster unit and component tests. Playwright runs real Chromium, Firefox and WebKit plus mobile emulation, and auto-waits, so tests use role-based locators like `getByRole('button', { name: 'Add to cart' })`, which also checks accessibility, and web-first assertions such as `toBeVisible` and `toHaveText` that retry, never fixed timeouts. I structure suites with page objects and custom fixtures, log in once with a setup project and `storageState`, mock unstable services with `page.route`, add axe accessibility checks and selective visual snapshots, and keep test data isolated. In CI the tests run against the preview deployment, in parallel and sharded, with retries and `trace: 'on-first-retry'`, so any flaky failure comes with a full trace to replay in the trace viewer, and flaky tests are fixed or quarantined quickly to keep trust in the suite."
