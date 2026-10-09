## 📄 Original answer (PDF)

**Question:** How do you handle cache invalidation and UI optimistic updates in a data-heavy React application?

**Answer:** Using libraries like React Query or Apollo Client, I implement Optimistic Updates to make the UI feel instantaneous by updating the cache immediately before the server responds. If the mutation fails, I rollback the cache.

**Real-time example:** A user clicking a 'Like' button. The UI increments the counter instantly (Optimistic Update). In the background, the API request fails. The catch block triggers a rollback, reverting the counter and showing a toast error.

---

## 💡 Optimistic update with TanStack Query

```tsx
function useLikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] })        // 1. stop in-flight refetches overwriting us
      const previous = queryClient.getQueryData<Post>(['post', postId])      // 2. snapshot for rollback
      queryClient.setQueryData<Post>(['post', postId], (old) =>               // 3. update the cache optimistically
        old ? { ...old, likes: old.likes + 1, likedByMe: true } : old
      )
      return { previous }                                                    //    context for onError
    },

    onError: (_error, postId, context) => {
      queryClient.setQueryData(['post', postId], context?.previous)          // 4. rollback
      toast.error("Couldn't like the post. Please try again.")
    },

    onSettled: (_data, _error, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })          // 5. re-sync with the server either way
    },
  })
}
```

**Why each step matters:**

| Step | Without it |
|---|---|
| `cancelQueries` | A refetch that was already running could overwrite the optimistic value with stale data |
| Snapshot `previous` | No way to roll back accurately |
| `invalidateQueries` in `onSettled` | The cache may drift from the truth (e.g. someone else also liked it) |

---

## 💡 Other ways to do it

- **TanStack Query v5 "via the UI":** render `mutation.variables` as a pending item, with no cache surgery. It's great for adding items to lists.
- **RTK Query:** `onQueryStarted` + `updateQueryData` returns a patch you can `undo()` on failure.
- **Apollo Client:** the `optimisticResponse` option; Apollo writes it to the normalised cache and replaces it with the real result.
- **React 19 `useOptimistic`:** built into React, for Actions and forms:

```tsx
const [optimisticLikes, addLike] = useOptimistic(likes, (current, n: number) => current + n)

function handleLike() {
  startTransition(async () => {
    addLike(1)                         // instant UI
    const fresh = await likePost(id)   // if this throws, the optimistic value is dropped automatically
    setLikes(fresh)
  })
}
```

---

## 💡 Cache invalidation strategy

**"There are only two hard things in computer science: cache invalidation and naming things."**

| Technique | Use |
|---|---|
| **Query keys as a hierarchy** | `['products']`, `['products', id]`, `['products', { category, page }]`. Invalidate `['products']` to refresh all of them. |
| **Invalidate after mutations** | `invalidateQueries({ queryKey: ['cart'] })` after add-to-cart |
| **Update directly from the response** | `setQueryData(['cart'], updatedCart)` saves a refetch when the API returns the new object |
| **Tags** (RTK Query) | `providesTags: ['Cart']`, `invalidatesTags: ['Cart']` |
| **`staleTime` per data type** | Product catalogue: 5 min; stock: 0; user profile: 1 min |
| **Server push** | A WebSocket event → `invalidateQueries`, for data changed by others |
| **Server-side (Next.js)** | `revalidateTag` / `updateTag` for cached server components |

**Query-key factory** (keeps keys consistent across a big codebase):

```ts
export const productKeys = {
  all: ['products'] as const,
  list: (filters: Filters) => [...productKeys.all, 'list', filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}
```

---

## 💡 When NOT to be optimistic

**Use optimistic UI for actions that almost always succeed and are easy to undo:** likes, toggles, reordering, renaming, adding to a wishlist.

**Avoid it (show a pending state instead) for:**

- **Payments, orders, stock reservations.**
- **Anything with significant server-side validation** or side effects.
- **Irreversible actions.**

Telling a user "Order placed!" and then rolling back destroys trust.

**Also handle:**

- **Rapid repeated clicks:** disable the button, debounce it, or make the server operation idempotent.
- **Conflicts:** server-side versioning (ETag / `If-Match`) to detect concurrent edits.

---

## 🎯 Interview answer

> "I let a server-state library own the cache, like TanStack Query, RTK Query or Apollo. For an optimistic like, the mutation's `onMutate` cancels in-flight queries for that post so they can't overwrite us, snapshots the previous data, and writes the incremented count into the cache; `onError` restores the snapshot and shows a toast; and `onSettled` invalidates the query to re-sync with the server either way. Alternatives are rendering pending mutation variables directly, RTK Query's `updateQueryData` patches with undo, Apollo's `optimisticResponse`, or React 19's `useOptimistic` with Actions. For invalidation, I use hierarchical query keys from a key factory, invalidate or directly update from mutation responses, set `staleTime` per data type, and push invalidations from WebSocket events for changes made by others. I only use optimistic updates for low-risk, reversible actions; for payments or orders I show a clear pending state, and I make repeated actions idempotent."
