## Quick answer

**Server Actions (React "Server Functions") are async functions marked with `"use server"` that run on the server but can be called from your components**, like a normal function or as a form `action`.

- **Under the hood,** Next.js turns each one into a **POST endpoint** with an encrypted ID. The client sends the arguments, the server runs the function, and the response can include **updated UI**, so revalidation and re-render happen in **one round trip**.
- **Use them for mutations:** forms, create/update/delete, likes, settings.
- **Security:** every exported Server Action is a **public HTTP endpoint**. Always **validate input, authenticate and authorise inside the action**, and return minimal data.

---

## Defining and calling actions

```ts
// app/actions/posts.ts: a module where every export is a Server Action
'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db'

const PostSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(1).max(10_000),
})

export async function createPost(formData: FormData) {
  const session = await verifySession()                     // 1. authenticate
  const parsed = PostSchema.safeParse({                     // 2. validate (never trust the client)
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) throw new Error('Invalid input')

  const post = await db.post.create({                       // 3. mutate
    data: { ...parsed.data, authorId: session.userId },
  })

  updateTag('posts')                                        // 4. invalidate caches (after the write)
  redirect(`/posts/${post.id}`)                             // 5. navigate (throws, so call it last)
}
```

```tsx
// app/posts/new/page.tsx: a Server Component form, which works even before JavaScript loads
import { createPost } from '@/app/actions/posts'

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="body" required />
      <button type="submit">Publish</button>
    </form>
  )
}
```

**Ways to call an action:**
- `<form action={action}>` or `<button formAction={action}>`: **progressive enhancement** (it works without client JavaScript).
- From a Client Component: `onClick={() => startTransition(() => likePost(id))}`, or as a normal async call.
- **Inline in a Server Component:** `async function save() { 'use server'; … }`. It can **close over** variables from the render; those are **encrypted** before they're sent to the client.
- **Pass to Client Components as props:** allowed, since Server Actions are serialisable references.

---

## Form state with React 19 hooks

```tsx
// the action receives the previous state first when used with useActionState
'use server'
export type State = { errors?: Record<string, string[]>; message?: string }

export async function signup(prevState: State, formData: FormData): Promise<State> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }   // return errors; don't throw
  await createUser(parsed.data)
  return { message: 'Account created' }
}
```

```tsx
'use client'
import { useActionState, useOptimistic } from 'react'
import { useFormStatus } from 'react-dom'
import { signup, type State } from './actions'

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(signup, {})

  return (
    <form action={formAction}>
      <input name="email" type="email" aria-describedby="email-error" />
      {state.errors?.email && <p id="email-error" role="alert">{state.errors.email[0]}</p>}
      <SubmitButton />
      {state.message && <p role="status">{state.message}</p>}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()           // reads the parent <form>'s status
  return <button disabled={pending}>{pending ? 'Creating…' : 'Sign up'}</button>
}
```

**Optimistic UI:**

```tsx
'use client'
export function LikeButton({ postId, likes }: { postId: string; likes: number }) {
  const [optimisticLikes, addLike] = useOptimistic(likes, (current, n: number) => current + n)
  return (
    <form action={async () => { addLike(1); await likePost(postId) }}>   {/* reverts automatically on failure */}
      <button>♥ {optimisticLikes}</button>
    </form>
  )
}
```

| Hook | Gives you |
|---|---|
| `useActionState(action, initial)` | `[state, formAction, isPending]`: the action's return value (validation errors, messages) |
| `useFormStatus()` (react-dom) | `{ pending, data, method, action }` for the **parent** `<form>`; use it in a child component |
| `useOptimistic(value, update)` | A temporary optimistic value during a transition |

---

## After a mutation

| Need | API |
|---|---|
| The user must see their change immediately | **`updateTag(tag)`** (Server Actions only, read-your-writes) |
| Refresh shared content in the background | `revalidateTag(tag, 'max')` |
| Refresh a whole path | `revalidatePath('/posts')` |
| Re-render uncached data on the page (counts, statuses) | **`refresh()`** |
| Go to another page | `redirect('/posts/1')`: call it **after** `try/catch`, since it throws |
| Set cookies (login, preferences) | `(await cookies()).set(...)`: only allowed in Actions and Route Handlers, **not during render** |

**Single round trip:** when an action revalidates or redirects, Next.js returns the **updated RSC payload together with the action's result**. The UI updates without a separate refetch.

---

## Security

**This is a top senior-interview topic.** Server Actions feel like function calls, but they're **network endpoints**.

**Built in:**
- **Encrypted, non-deterministic action IDs**, regenerated across builds.
- **Dead-code elimination:** unused actions are removed and get no endpoint.
- **Closure variables are encrypted** before being sent to the client.
- **POST only**, plus an **`Origin` vs `Host` check** (CSRF protection). Configure `serverActions.allowedOrigins` behind reverse proxies.
- **Body size limit** (`serverActions.bodySizeLimit`, 1 MB by default).

**Your job:**

| Rule | Why |
|---|---|
| **Authenticate inside every action** | A page-level auth check doesn't protect the actions defined in it; anyone can POST to them directly |
| **Authorise the specific resource** (ownership/role) | Prevents IDOR: `deletePost(id)` must check that **this user owns** that post |
| **Validate and parse every argument** (zod) | Arguments come from the client, typed or not |
| **Return minimal data** | Return values are serialised to the client; never return full database records |
| **Don't rely on closure encryption for secrets** | It's defence in depth; keep secrets out of closures |
| **Put auth + database logic in a `server-only` DAL** | Thin actions, one audited place for checks |
| **Rate-limit expensive actions** | Emails, payments, sign-ups |
| **Prevent duplicate mutations** | Disable the button (`useFormStatus`) **and** enforce it on the server: idempotency keys, unique constraints, version checks (see **System Design → Preventing duplicate form submissions**) |
| **Keep Next.js and React patched** | e.g. **CVE-2025-55182 ("React2Shell")**, a critical RCE in React Server Components' Server Function handling (Dec 2025; see **Authentication & security**) |

```ts
'use server'
export async function deletePost(postId: string) {
  const session = await verifySession()                      // who are you?
  const id = z.string().uuid().parse(postId)                  // valid input?
  const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post || post.authorId !== session.userId) throw new Error('Forbidden')   // is it yours?
  await db.post.delete({ where: { id } })
  updateTag('posts')
  return { ok: true }                                         // minimal response
}
```

**Multi-instance deployments:** set the same **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** on all instances, otherwise *"Failed to find Server Action"* errors appear. Use a `deploymentId` for version skew.

---

## Server Action or Route Handler?

| Use a **Server Action** when | Use a **Route Handler** when |
|---|---|
| The mutation is triggered by **your own React UI** (forms, buttons) | **Non-React clients** call it: mobile apps, third parties, cron jobs |
| You want progressive enhancement, form state and revalidation in one round trip | **Webhooks** (Stripe, CMS) with signature verification |
| | You need full HTTP control: streaming, file downloads, custom status codes, CORS |
| | A public, versioned API contract |

**Don't use Server Actions for data fetching.** They're POST requests, they're **dispatched one at a time** per client, and they aren't cached. Fetch in Server Components instead.

---

## Interview Q&A

**Q: What are Server Actions?**
Async functions marked `"use server"` that run on the server and can be called from components or used as form actions. Next.js exposes each as an encrypted POST endpoint and can return updated UI in the same response.

**Q: How would you secure a Server Action?**
Treat it as a public endpoint: authenticate and authorise the specific operation inside it, validate every argument with a schema, return minimal data, rate-limit expensive actions, and keep the logic in a server-only data access layer. Built-in origin checks and encrypted IDs are only defence in depth.

**Q: How do you show validation errors and pending states?**
`useActionState` for the returned state (field errors, messages) and an `isPending` flag, `useFormStatus` in a child submit button, and `useOptimistic` for instant feedback.

**Q: How do you prevent duplicate submissions?**
Disable the button while pending in the UI, and on the server use idempotency keys, unique constraints or version checks, invalidating caches only after the write commits.

**Q: Should every mutation use a Server Action?**
No. For webhooks, mobile clients, third-party integrations and public APIs, use Route Handlers with a stable HTTP contract.

---

## 🎯 Interview answer

> "Server Actions are async functions marked `use server` that run on the server but can be passed to forms or called from components. Next.js compiles each into an encrypted POST endpoint, so a form works even without JavaScript, and when the action revalidates or redirects, the updated UI comes back in the same round trip. I pair them with React 19 hooks: `useActionState` for returned validation errors and pending state, `useFormStatus` in the submit button, and `useOptimistic` for instant feedback. After writing, I use `updateTag` for read-your-writes, `revalidateTag` with a profile for background refreshes, `refresh` for uncached data, and `redirect` last, since it throws. The key point is security: every exported action is a public endpoint, so inside each one I authenticate, authorise ownership of the specific resource to prevent IDOR, validate arguments with zod, return minimal data, and rate-limit expensive operations, with the logic in a server-only data access layer. Built-in protections like encrypted IDs, dead-code elimination, encrypted closures, POST-only requests with origin checks, and the body size limit are defence in depth, not access control. For multi-instance deployments I share the encryption key, I prevent duplicate mutations on the server with idempotency, and I use Route Handlers instead for webhooks, mobile clients and public APIs."
