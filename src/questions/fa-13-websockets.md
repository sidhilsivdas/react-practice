## 📄 Original answer (PDF)

**Question:** Design a scalable architecture for handling real-time data using WebSockets in React.

**Answer:** I instantiate a singleton WebSocket manager or use a dedicated context/hook wrapper (like `react-use-websocket`). For scale, the WS connection dispatches events to a state manager (like Redux) or invalidates specific React Query caches rather than triggering manual component re-renders.

**Real-time example:** A live trading platform where the WS stream pushes price ticks. The hook updates a Zustand store ref, bypassing standard React rendering cycles for high-frequency updates, only rendering the delta.

---

## 💡 Architecture

```
            ┌──────────────── Browser ────────────────────────────────────────────┐
WS server ⇄ │ SocketManager (ONE connection, outside React)                        │
            │   ├ reconnect with backoff + jitter, heartbeat, resubscribe on reconnect
            │   ├ subscribe(channel) / unsubscribe, ref-counted by component use │
            │   └ routes messages by type ───────────────────────────────┐         │
            │                                                            ▼         │
            │   High-frequency (price ticks) → external store (Zustand)  → components select only their symbol
            │   Domain events (order filled)  → queryClient.invalidateQueries(['orders'])
            │   Notifications                 → toast / notification slice       │
            └──────────────────────────────────────────────────────────────────────┘
```

**Key idea: the connection lives outside React components**, so re-renders, StrictMode double-mounts and route changes don't open multiple sockets.

---

## 💡 Socket manager

```ts
type Listener = (data: unknown) => void

class SocketManager {
  private ws: WebSocket | null = null
  private listeners = new Map<string, Set<Listener>>()
  private retry = 0

  connect(url: string) {
    this.ws = new WebSocket(url)
    this.ws.onopen = () => {
      this.retry = 0
      for (const channel of this.listeners.keys()) this.send({ type: 'subscribe', channel })   // resubscribe
    }
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      this.listeners.get(msg.channel)?.forEach((fn) => fn(msg.data))
    }
    this.ws.onclose = () => {
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++) * (0.5 + Math.random())        // backoff + jitter
      setTimeout(() => this.connect(url), delay)
    }
  }

  subscribe(channel: string, fn: Listener) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
      this.send({ type: 'subscribe', channel })
    }
    this.listeners.get(channel)!.add(fn)
    return () => {                                         // unsubscribe function (for effect cleanup)
      const set = this.listeners.get(channel)!
      set.delete(fn)
      if (set.size === 0) {
        this.listeners.delete(channel)
        this.send({ type: 'unsubscribe', channel })
      }
    }
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }
}

export const socket = new SocketManager()                 // singleton
```

---

## 💡 High-frequency data

**Re-rendering React on every tick (say, 50 updates per second across 200 symbols) kills INP.**

**Strategies:**

1. **Store outside React** (Zustand / `useSyncExternalStore`) + **fine-grained selectors**, so a row re-renders only when **its** symbol changes.
2. **Batch / throttle UI updates:** collect ticks and flush once per animation frame (`requestAnimationFrame`) or every 100–250 ms.
3. **Transient updates for the hottest values:** write straight to the DOM via a ref, with no React render. This is the PDF's "bypassing standard React rendering" point.
4. **Virtualise** long lists, so only visible rows exist.
5. **Move parsing and aggregation to a Web Worker** if the volume is large.

```ts
// Zustand store fed by the socket, flushed once per frame
const usePrices = create<{ prices: Record<string, number> }>(() => ({ prices: {} }))

let buffer: Record<string, number> = {}
let scheduled = false

socket.subscribe('prices', (tick: { symbol: string; price: number }) => {
  buffer[tick.symbol] = tick.price
  if (!scheduled) {
    scheduled = true
    requestAnimationFrame(() => {
      usePrices.setState((s) => ({ prices: { ...s.prices, ...buffer } }))   // one update per frame
      buffer = {}
      scheduled = false
    })
  }
})

// a row subscribes to ONE symbol only
function PriceCell({ symbol }: { symbol: string }) {
  const price = usePrices((s) => s.prices[symbol])
  return <td>{price?.toFixed(2)}</td>
}
```

---

## 💡 Server state integration

**For "something changed" events, don't copy data into the store. Invalidate instead:**

```ts
socket.subscribe('orders', (event: { type: string; orderId: string }) => {
  if (event.type === 'order.updated') {
    queryClient.invalidateQueries({ queryKey: ['orders'] })            // refetch with normal caching
    // or patch directly: queryClient.setQueryData(['order', event.orderId], ...)
  }
})
```

---

## 💡 Production concerns

| Concern | Solution |
|---|---|
| **Auth** | A short-lived token in the connection message (or a cookie); re-authenticate on reconnect; close on logout |
| **Missed messages during a disconnect** | Sequence numbers or timestamps, and refetch a snapshot after reconnecting |
| **Backpressure** | Server-side throttling and conflation (send only the latest price) |
| **Scaling the servers** | Sticky sessions or a pub/sub layer (Redis, Kafka) behind the WS servers; managed services (Ably, Pusher, AWS API Gateway WebSockets) |
| **Tab in background** | Reduce updates or pause subscriptions (Page Visibility API) |
| **Simpler alternatives** | **SSE** (Server-Sent Events) for one-way server→client streams; **polling** (TanStack Query `refetchInterval`) for low-frequency updates |

---

## 🎯 Interview answer

> "I keep one WebSocket connection in a singleton manager outside React, so re-renders and StrictMode don't open duplicate sockets. It handles reconnection with exponential backoff and jitter, heartbeats, resubscribing after reconnect and auth, and exposes reference-counted `subscribe` functions that components call in effects and clean up on unmount. Messages are routed by type: domain events like 'order updated' invalidate or patch TanStack Query caches rather than duplicating server data, and high-frequency streams like price ticks go into an external store such as Zustand. For those, I batch updates once per animation frame, use fine-grained selectors so a row only re-renders when its own symbol changes, use transient ref-based DOM updates for the hottest values, virtualise long lists, and use a Web Worker for heavy parsing. I also plan for missed messages with sequence numbers and a snapshot refetch, server-side conflation, backgrounded tabs, and horizontal scaling with Redis pub/sub, and I'd choose SSE or polling instead when updates are one-way or infrequent."
