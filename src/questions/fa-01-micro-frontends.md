## 📄 Original answer (PDF)

**Question:** How would you architect a Micro-Frontend (MFE) system for a large-scale enterprise application?

**Answer:** I would use Webpack Module Federation to stitch together multiple independent React applications at runtime. A 'Host' application acts as the shell (handling routing and global layout), while 'Remote' applications (managed by separate teams) expose specific UI modules.

**Real-time example:** A banking portal where the 'Dashboard', 'Transfers', and 'Investments' tabs are entirely separate React repositories deployed independently, but load seamlessly into the Host App's DOM.

---

## 💡 How Module Federation works

```
                    ┌──────────────── Host (shell) ────────────────┐
 Browser ─────────▶ │ routing, layout, auth, design system,        │
                    │ shared singletons (react, react-dom, router) │
                    └──────┬─────────────────┬─────────────────┬───┘
            loads at runtime│                 │                 │
                 remoteEntry.js        remoteEntry.js     remoteEntry.js
              ┌──────────────┐      ┌──────────────┐   ┌──────────────┐
              │ Dashboard MFE │      │ Transfers MFE│   │Investments MFE│
              │ team A, own CI│      │ team B       │   │ team C        │
              └──────────────┘      └──────────────┘   └──────────────┘
```

```js
// transfers/ (remote) module federation config, simplified
new ModuleFederationPlugin({
  name: 'transfers',
  filename: 'remoteEntry.js',
  exposes: { './TransfersApp': './src/TransfersApp' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },   // ONE copy of React
})

// host/ (shell)
new ModuleFederationPlugin({
  name: 'host',
  remotes: { transfers: 'transfers@https://cdn.bank.com/transfers/remoteEntry.js' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
})

// host route
const TransfersApp = lazy(() => import('transfers/TransfersApp'))
<Route path="/transfers/*" element={<Suspense fallback={<Spinner />}><ErrorBoundary><TransfersApp /></ErrorBoundary></Suspense>} />
```

**2026 update:** Module Federation is no longer Webpack-only. **Module Federation 2.0** works with **Rspack, Vite** (`@module-federation/vite`) and Webpack, and adds type sharing and a runtime API. For Next.js, **multi-zones** (different apps own different URL paths) is the simpler built-in option.

---

## 💡 Decisions an architect must make

| Concern | Recommended approach |
|---|---|
| **Splitting** | By **business domain / route** (Transfers, Investments), not by technical layer (header, footer) |
| **Shared dependencies** | `react`, `react-dom`, router as **singletons**; agree version ranges, or you'll load two Reacts and break hooks |
| **Design system** | One shared, versioned UI package, so the MFEs look like one product |
| **Communication between MFEs** | Keep it minimal: URL/route params, custom browser events, or a tiny event bus. **No shared global store.** |
| **Auth** | The host handles login; remotes read the session (cookie or a context passed down) |
| **Failure isolation** | Error boundary + fallback per remote, so one broken team doesn't break the whole portal |
| **Deployment** | Each remote deploys independently; the host reads remote URLs from a **manifest** (no rebuild needed), versioned for rollback |
| **Testing** | Contract tests on the exposed modules, plus E2E tests on the composed app |
| **Performance** | Watch for duplicate libraries, extra network requests for each remoteEntry, and waterfalls; prefetch likely remotes |

---

## 💡 When NOT to use MFEs

**Micro-frontends solve an organisational problem (many teams releasing independently), and they add technical cost:**

- **Version skew** between remotes, and duplicated bundles.
- **Harder local development, debugging and end-to-end testing.**
- **A runtime failure mode:** a remote CDN is down.
- **UX consistency drift** between teams.

**Alternatives first:**

- **A well-modularised monolith.**
- **A monorepo (Nx/Turborepo) with module boundaries and independent package ownership.**
- **Next.js multi-zones.**

**Rule of thumb:** consider MFEs only when **several autonomous teams** need **independent release cycles** on one product.

---

## 🎯 Interview answer

> "I'd first confirm MFEs are justified: they solve the organisational problem of many teams needing independent releases, and they bring runtime complexity, so for one or two teams a monorepo with strict module boundaries is better. If they are justified, I'd split by business domain, like Dashboard, Transfers and Investments, with a host shell owning routing, layout, auth and the design system, and each remote exposing its app through Module Federation (now available for Webpack, Rspack and Vite with Module Federation 2.0). React, react-dom and the router are shared singletons to avoid duplicate React instances. Each remote loads lazily behind Suspense and its own error boundary, so one failing team doesn't take down the portal. The host reads remote URLs from a versioned manifest, so teams deploy and roll back independently. Communication between MFEs stays minimal, through the URL or custom events rather than a shared store, and a shared design-system package keeps the UI consistent. I'd back it with contract tests per remote, E2E tests on the composed app, and monitoring for bundle duplication and load performance."
