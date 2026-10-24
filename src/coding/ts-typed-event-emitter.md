## Problem

Build an **event emitter where every event name and payload is type-checked**. You describe the events once, as a map from name to payload type:

```ts
type AppEvents = {
  login: { userId: number }
  logout: undefined
}
const events = new Emitter<AppEvents>()
```

1. Make `Emitter` generic over its `Events` map.
2. `on(event, listener)`: adds a listener and **returns a function that removes it**.
3. `emit(event, payload)`: calls every listener of that event with the payload.

## Examples

```ts
events.on('login', (payload) => payload.userId)   // payload: { userId: number }
events.emit('login', { userId: 1 })               // ✅
events.emit('login', { userId: '1' })             // ❌ userId must be a number
events.on('signup', () => {})                     // ❌ no such event

const off = events.on('logout', () => {})
off()                                              // removes that listener
```

## Hints

1. `class Emitter<Events extends Record<string, unknown>>`.
2. Give each method its own type parameter for the event name: `on<E extends keyof Events>(event: E, listener: (payload: Events[E]) => void)`. `Events[E]` is that event's payload type.
3. Type the storage with a **mapped type**: `{ [E in keyof Events]?: Array<(payload: Events[E]) => void> }`.
4. `(this.listeners[event] ??= []).push(listener)` creates the array on first use.

<!-- SOLUTION -->

## Solution

```ts
class Emitter<Events extends Record<string, unknown>> {
  private listeners: { [E in keyof Events]?: Array<(payload: Events[E]) => void> } = {}

  on<E extends keyof Events>(event: E, listener: (payload: Events[E]) => void): () => void {
    ;(this.listeners[event] ??= []).push(listener)
    return () => {
      this.listeners[event] = this.listeners[event]?.filter((l) => l !== listener)
    }
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    this.listeners[event]?.forEach((listener) => listener(payload))
  }
}
```

## How the types connect

```ts
events.emit('login', { userId: 1 })
// Events = AppEvents          (from new Emitter<AppEvents>())
// E      = 'login'            (inferred from the first argument, must be keyof AppEvents)
// payload must be AppEvents['login'] = { userId: number }
```

Two levels of generics:

| Type parameter | Set when | Means |
|---|---|---|
| `Events` (class) | `new Emitter<AppEvents>()` | The whole event map |
| `E` (method) | Each `on` / `emit` call | The one event being used |

## The mapped type

```ts
{ [E in keyof Events]?: Array<(payload: Events[E]) => void> }
// for AppEvents:
// {
//   login?: Array<(payload: { userId: number }) => void>
//   logout?: Array<(payload: undefined) => void>
// }
```

Each event gets an array of listeners **for its own payload type**, so you can't store a `logout` listener under `login`.

## Real-world uses

The same "event map" pattern is everywhere: Node's typed `EventEmitter<T>`, `window.addEventListener` (typed by `WindowEventMap`, so `'click'` gives a `MouseEvent`), Socket.IO's typed events, and many state-management libraries.

## 🎯 Interview answer

> "I make the class generic over an event map type, where each key is an event name and its value is the payload type. Each method then has its own type parameter `E extends keyof Events`, and the listener or payload uses the indexed access type `Events[E]`, so the payload type follows the event name. Storage is a mapped type giving each event an array of correctly typed listeners. `on` returns an unsubscribe function. It's the same pattern the DOM uses with `WindowEventMap` in `addEventListener`."
