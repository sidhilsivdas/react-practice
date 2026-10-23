> Notes and a step-by-step explanation of the video **"System Design Interview: Design Ticketmaster w/ a Ex-Meta Staff Engineer"** by *Hello Interview* (58 min).
> Video: https://www.youtube.com/watch?v=fhdPyoO6aXI
>
> Timestamps like `(12:00)` point to the place in the video where each topic is covered.

### 🗺️ How to read the diagrams

The design is built up **one piece at a time**. Every diagram uses the same legend:

```
┌────────────┐
│  Existing  │   single line  = already there from an earlier step
└────────────┘

╔════════════╗
║ ★ NEW      ║   double line + ★ = added in THIS step
╚════════════╝

──────►   request / data flow
═════►    NEW flow added in this step
```

Under each diagram there is a **"What's new & why"** table, so you always know *what* changed and *which problem* it solves.

---

## 1. What Are We Building?

`(0:00)`

**Ticketmaster** is a website for buying tickets to concerts, sports matches and shows. Think of booking a movie seat on BookMyShow: you pick an event, see a seat map, choose a seat and pay.

This question is asked a lot at **Meta** (in the "product design" round) and at many other big companies.

> 💡 **Why this question is interesting:** most of the time the site is quiet. But when Taylor Swift tickets go on sale, **millions of people** try to grab the **same few thousand seats** in the same minute, and two people must **never** get the same seat.

---

## 2. The Interview Roadmap

`(1:20)`

He follows the same 5 steps for every product-style design question. Learn this order; it works for almost any system design interview.

```
 ① Requirements  ──►  ② Core Entities  ──►  ③ API  ──►  ④ High-Level Design  ──►  ⑤ Deep Dives
  (what + how well)     (what data)        (endpoints)   (simple, working)         (make it great)
```

| Step | Question it answers | Time |
|---|---|---|
| ① Requirements | What should the system *do*? How *well* must it do it? | ~5 min |
| ② Core entities | What data do we store? | ~2 min |
| ③ API | What endpoints does the client call? | ~5 min |
| ④ High-level design | A **simple** design that makes every feature work | ~15 min |
| ⑤ Deep dives | Make it fast, scalable and correct under load | rest |

> 💡 **Key rule:** in step ④ make it *work*. In step ⑤ make it *good*. Don't try to do both at once.

---

## 3. Step ①a: Functional Requirements (Features)

`(2:40)`

Functional requirements are **features**, written as *"Users should be able to…"*.

**Trick:** start from the most important action and walk **backwards** through the user's journey.

```
 What is the core thing?        Book a ticket
        ▲  how did they get there?
 They looked at an event        View an event (details + seat map)
        ▲  how did they find it?
 They searched                  Search for events
```

So our three features are:

1. ✅ **Search** for events
2. ✅ **View** an event (details, venue, performer, seat map)
3. ✅ **Book** a ticket

> If you have never used the product, **ask the interviewer** how it works. That's allowed and expected.

---

## 4. Step ①b: Non-Functional Requirements (Qualities)

`(4:10)`

Non-functional requirements are **qualities** of the system: scalability, availability, consistency, latency…

> ⚠️ **Biggest mistake candidates make:** just writing "scalable, available, reliable". *Every* system wants those. Instead, say what makes **this** system special.

### a) CAP theorem: consistency or availability? `(5:00)`

Quick refresher: when the network breaks, a distributed system must choose between
- **Consistency (C):** everyone sees the same, latest data (or gets an error), or
- **Availability (A):** everyone gets an answer, even if it's slightly old.

| Level | Answer |
|---|---|
| Mid-level | "Consistency, because we must **never double-book** a seat." ✅ OK |
| Senior | "**Both**, in different parts of the system." ⭐ Better |

The senior answer:

| Part of the system | Choose | Why |
|---|---|---|
| **Booking** a ticket | **Strong consistency** | If someone in Germany buys seat A12, I in the USA must see that *immediately* (or get an error). Two owners of one seat = disaster. |
| **Search / view** events | **High availability** | If a new event shows up 5 seconds late in search, nobody cares. But search being down is bad. |

### b) Read vs write ratio `(6:50)`

Many people browse, few people buy. If ~1% of visitors buy a ticket, that's **about 100 reads for every 1 write**.
👉 Later this tells us: **cache heavily** for reads.

### c) Traffic pattern: sudden spikes `(7:30)`

Normal days are steady. But Taylor Swift / Super Bowl / World Cup sales bring **tens of millions of users at once**.
👉 Don't just write "scalable". Write **"scalable to handle surges from popular events"**.

### d) Low-latency search (added later at 36:00)

He forgot this at first and **added it during the design**. That's totally fine in a real interview.

### e) Out of scope

GDPR, fault tolerance, backups… write them in a small "out of scope" list, then ask:

> *"These are what I'll prioritise, these are out of scope. Would you like me to move anything up or down?"*

This shows you see the big picture **and** can focus.

### ✍️ Final list

```
Functional                      Non-functional
─────────────                   ─────────────────────────────────────────
• Search events                 • Strong consistency for BOOKING (no double booking)
• View an event                 • High availability for SEARCH & VIEW
• Book a ticket                 • Handle huge spikes for popular events
                                • Low-latency search
                                • Reads ≫ writes (~100 : 1)
```

---

## 5. Step ②: Core Entities (What Data Do We Store?)

`(9:20)`

Just name the main "things". **Don't list every column yet**: you don't really know them, and they will change while you design.

```
┌──────────┐      ┌──────────┐      ┌───────────┐
│  Event   │─────►│  Venue   │      │ Performer │
│          │─────────────────────►  │           │
└────┬─────┘      └──────────┘      └───────────┘
     │ one event has MANY tickets
     ▼
┌──────────┐
│  Ticket  │  (one ticket = one seat)
└──────────┘
```

| Entity | What it is |
|---|---|
| **Event** | The show / match (name, date, description) |
| **Venue** | Where it happens (stadium, location, seat map) |
| **Performer** | Who is performing (artist or team) |
| **Ticket** | One seat for one event: seat, price, status, who bought it |

> Admins *create* events; that's out of scope. We only design the **user's** path.

---

## 6. Step ③: The API (Endpoints)

`(11:00)`

Rule: go through your functional requirements **one by one** and write an endpoint for each. He uses **REST** (most common in interviews; GraphQL is the main alternative).

### View an event `(12:00)`

```http
GET /events/:eventId
→ { event, venue, performer, tickets[] }
```

`tickets[]` is needed to draw the **seat map** (which seats exist, which are free).

### Search events `(12:50)`

```http
GET /search?term=taylor&location=SF&type=music&date=2026-12-01
→ Partial<Event>[]
```

All query params are optional. It returns **partial** events: just enough (name, date, image) to show a results list. Clicking one calls `GET /events/:eventId` for full details.

### Book a ticket: it's actually TWO steps! `(14:30)`

Think about buying a flight seat or a movie ticket:

```
 1. Click a seat  ──►  seat is HELD for you, 10-min timer starts ⏱️
 2. Enter card    ──►  pay  ──►  seat is BOOKED ✅
                       (if the timer runs out, the seat is released again)
```

So we need two endpoints:

```http
POST /booking/reserve
Header: Authorization: Bearer <JWT>
Body:   { ticketId }

PUT /booking/confirm
Header: Authorization: Bearer <JWT>
Body:   { ticketId, paymentDetails }
```

> 🔒 **Security point:** notice there's **no `userId` in the body**. If there were, anyone could book (or cancel!) seats as another user just by changing that number. The user is identified from the **JWT / session token in the header**, which the server verifies. Mentioning this shows good engineering sense.

`paymentDetails` comes from **Stripe's** frontend library (a React/JS component collects the card details safely).

---

## 7. Step ④: High-Level Design, Built Up Piece by Piece

`(17:40)`

Goal: the **simplest** design that makes all 3 features work. We go **endpoint by endpoint**.

### 7.1 Feature "View an event"

`(18:00)`

```
╔══════════╗      ╔══════════════╗      ╔══════════════════╗      ╔═══════════════════╗
║ ★ Client ║═════►║ ★ API        ║═════►║ ★ Event Service  ║═════►║ ★ Database        ║
║ (browser)║      ║   Gateway    ║      ║   (CRUD)         ║      ║   (PostgreSQL)    ║
╚══════════╝      ╚══════════════╝      ╚══════════════════╝      ║ events, venues,   ║
                   auth, rate limit,     GET /events/:id           ║ performers,       ║
                   routing               → join event+venue+       ║ tickets           ║
                                           performer+tickets       ╚═══════════════════╝
```

| ★ What's new | Why |
|---|---|
| **Client** | The user's browser/app. |
| **API Gateway** | One front door for all requests. It **routes** each request to the right microservice, and also does **authentication** and **rate limiting**. |
| **Event Service** | A microservice that reads event data. (He picks **microservices**: the most common choice in interviews.) |
| **PostgreSQL database** | Stores our 4 entities. |

**Why PostgreSQL?** `(21:30)`
- Tickets need **ACID transactions** (so a seat can't be sold twice).
- The data has simple **relationships** (event → venue, event → many tickets).
- "I know it well."

> 💡 **SQL vs NoSQL is an outdated debate.** DynamoDB (NoSQL) would also work; it supports transactions too. Senior candidates say *"these are the properties I need; both would work; I'm picking Postgres because I know it"*, and move on. Mid-level candidates often waste time comparing them.

**Tables so far:**

```
Event:     id, venueId (FK), performerId (FK), name, description, date
Venue:     id, location, seatMap
Performer: id, name, ...
Ticket:    id, eventId (FK), seat, price
```

---

### 7.2 Feature "Search events"

`(23:30)`

```
                                        ┌──────────────────┐
                                  ┌────►│  Event Service   │────────┐
┌──────────┐      ┌────────────┐  │     └──────────────────┘        ▼
│  Client  │─────►│ API Gateway│──┤                            ┌──────────────┐
└──────────┘      └────────────┘  │     ╔══════════════════╗   │  PostgreSQL  │
                                  └════►║ ★ Search Service ║══►│              │
                                        ╚══════════════════╝   └──────────────┘
                                         SELECT * FROM events
                                         WHERE name LIKE '%term%'
```

| ★ What's new | Why |
|---|---|
| **Search Service** | Handles `GET /search`. For now it just runs a SQL query on the same database. |

⚠️ **This is slow on purpose.** `LIKE '%term%'` (wildcard at the start) can't use an index, so the database must **scan every row**: a *full table scan*. Say it out loud in the interview: *"This won't scale. I'll fix it in the deep dive once all features work."* (We fix it in section 8.1.)

---

### 7.3 Feature "Book a ticket" (reserve → pay → confirm)

`(25:00)`

```
                                        ┌──────────────────┐
                                  ┌────►│  Event Service   │──────────┐
                                  │     └──────────────────┘          │
┌──────────┐      ┌────────────┐  │     ┌──────────────────┐          ▼
│  Client  │─────►│ API Gateway│──┼────►│  Search Service  │──►┌───────────────────┐
└──────────┘      └────────────┘  │     └──────────────────┘   │    PostgreSQL     │
                                  │     ╔══════════════════╗   │ Ticket:           │
                                  └════►║ ★ Booking        ║══►│ + ★ status        │
                                        ║   Service        ║   │ + ★ userId        │
                                        ╚════════╤═════════╝   └───────────────────┘
                                          ▲      ║ charge card
                                 ★ webhook║      ▼
                                        ╔═╩═══════════════╗
                                        ║ ★ Stripe        ║
                                        ║ (payments,      ║
                                        ║  3rd party)     ║
                                        ╚═════════════════╝
```

| ★ What's new | Why |
|---|---|
| **Booking Service** | Handles `reserve` and `confirm`. |
| **`status` column** on Ticket | `available` → `reserved` → `booked`. This is how we know a seat is taken. |
| **`userId` column** on Ticket | Who owns the seat after payment. |
| **Stripe** | Payments are hard; we hand them to a 3rd party (unless the interview is *about* payments). |
| **Webhook** | Stripe processes the payment **asynchronously** (it talks to banks/card networks), then calls **our** endpoint back with the result. |

**The flow:**

```
1. POST /booking/reserve {ticketId}
     → UPDATE ticket SET status='reserved' WHERE id=ticketId
     → 200 OK, user goes to the payment page (10-min timer)

2. PUT /booking/confirm {ticketId, paymentDetails}
     → send payment to Stripe
     → ... Stripe talks to the bank ...
     → Stripe calls our webhook: "payment succeeded"
     → UPDATE ticket SET status='booked', userId=<from JWT>
     → (maybe send a confirmation email: out of scope)
```

---

### 7.4 🐛 The bug: seats stuck "reserved" forever

`(28:00)`

What if the user clicks a seat, reaches the payment page, then **closes the laptop**?

```
status = 'reserved'  ──── 10 min ──── 1 hour ──── 1 week ────►  still 'reserved' 😱
```

Nobody ever sets it back to `available`. The seat is lost. He shows **three fixes, from weakest to best**:

#### ❌ Fix 1: Add a `reservedAt` timestamp

```sql
-- "available" now means: available OR reserved more than 10 minutes ago
SELECT * FROM tickets
WHERE status = 'available'
   OR (status = 'reserved' AND reservedAt < NOW() - INTERVAL '10 minutes');
```

Works, but **messy**: the `status` says "reserved" when the seat really isn't. Two columns must be kept in sync.

#### 😐 Fix 2: A cron job `(29:30)`

A scheduled job runs every 10 minutes and resets expired reservations back to `available`.

```
Seat should be released at   12:00
Cron job happens to run at   12:09   ← n = 9 minutes late
Seat was held for            19 minutes instead of 10
```

✅ Acceptable for **mid-level**. ❌ Not good enough for senior/staff: there's always a delay `n` between "should be free" and "is free".

#### ⭐ Fix 3: A distributed lock in Redis with a TTL `(31:00)`

Remove the `reserved` status, `reservedAt` and the cron job completely. Use **Redis** (an in-memory key-value store) with **TTL** (time-to-live: Redis deletes the key automatically when the time runs out).

```
                                        ┌──────────────────┐
                                  ┌────►│  Event Service   │──────────┐
                                  │     └────────┬─────────┘          │
┌──────────┐      ┌────────────┐  │              ║ ★ "which seats     │
│  Client  │─────►│ API Gateway│──┤              ║    are locked?"    ▼
└──────────┘      └────────────┘  │              ▼                ┌──────────────┐
                                  │     ╔══════════════════╗      │  PostgreSQL  │
                                  │     ║ ★ Redis          ║      │ status:      │
                                  │     ║   Ticket Lock    ║      │ available /  │
                                  │     ║ ticketId → true  ║      │ booked only  │
                                  │     ║ TTL = 10 min     ║      └──────────────┘
                                  │     ╚══════════════════╝             ▲
                                  │              ▲ ★ lock on reserve     │
                                  │     ┌────────┴─────────┐             │
                                  └────►│ Booking Service  │─────────────┘
                                        └────────┬─────────┘  write only on confirm
                                                 ▼
                                        ┌──────────────────┐
                                        │     Stripe       │
                                        └──────────────────┘
          (Search Service hidden to keep the picture small; it hasn't changed)
```

| ★ What's new | Why |
|---|---|
| **Redis Ticket Lock** | `SET ticket:123 true EX 600` → seat is held for exactly 10 min, then **auto-released**. No cron job, no delay. |
| **Booking → Redis** | `reserve` now only writes the lock (not the DB). |
| **Event Service → Redis** | When showing the seat map: get `available` tickets from Postgres, then **remove any that are locked** in Redis. |
| **Removed** `reserved` status & `reservedAt` | Not needed anymore: Redis tracks holds. Postgres only stores `available` / `booked`. |

**Why "distributed"?** `(33:00)` The Booking Service runs on **many machines** (scaled horizontally). If each machine kept locks in its own memory, machine A wouldn't know machine B locked seat 12. A single shared Redis gives **every** machine the same view.

```js
// Booking Service: reserve
// userId comes from the verified JWT, never from the request body
async function reserve(ticketId, userId) {
  // NX = only set if it doesn't exist; EX = expire after 600 s
  const ok = await redis.set(`lock:${ticketId}`, userId, { NX: true, EX: 600 })
  if (!ok) throw new Error('Seat already held by someone else')
}
```

**Interviewer follow-up: "What if Redis crashes?"** `(33:40)`
- We spin up a new one quickly, but all current locks are **lost**.
- For up to 10 minutes, several users might reach the payment page for the same seat.
- **Postgres still protects us:** the `confirm` write is an ACID transaction, so only the **first** user to pay wins; the others get an error.
- So: **no double booking** (consistency is safe), just a worse user experience for a few minutes. That's a trade-off to agree with the product team. He thinks it's acceptable.

> 🎯 **Mid-level candidates** usually stop at the cron job. Reaching the Redis lock already puts you very close to passing.

---

## 8. Step ⑤: Deep Dives

`(35:20)`

> **How to choose deep dives:** go back to your **non-functional requirements** and ask *"which ones does my design not meet yet?"* Seniors should aim for 2–3 good deep dives.

Our design so far is **correct** but: search is slow ❌, it won't survive Taylor Swift traffic ❌, the seat map gets stale ❌.

---

### 8.1 Deep dive: Fast search with Elasticsearch

`(37:00)`

```
                                      ┌──────────────────┐        ┌──────────────┐
                                ┌────►│  Event Service   │───────►│  PostgreSQL  │
                                │     └──────────────────┘        └──────┬───────┘
┌──────────┐    ┌────────────┐  │                                         ║ ★ CDC
│  Client  │───►│ API Gateway│──┤                                         ║ (change
└──────────┘    └────────────┘  │     ┌──────────────────┐        ╔══════▼═══════╗  stream)
                                └────►│  Search Service  │═══════►║ ★ Elastic-   ║
                                      └──────────────────┘ ★ query║   search     ║
                                                                  ╚══════════════╝
              (Booking Service, Redis and Stripe unchanged; hidden to save space)
```

| ★ What's new | Why |
|---|---|
| **Elasticsearch** | A database built for search. Fixes the slow `LIKE '%term%'` full-table scan. |
| **Search Service → Elasticsearch** | Search queries no longer touch Postgres at all. |
| **CDC from Postgres → Elasticsearch** | Keeps the search copy in sync automatically when events change. |

**How Elasticsearch is fast: the inverted index** `(37:40)`

It breaks text into words (*tokens*) and builds a map from **word → events containing it**, like the index at the back of a book:

```
Event 1: "Philadelphia Eagles playoff wildcard game vs Broncos"
Event 5: "Taylor Swift Eras Tour"

Inverted index:
  "eagles"   → [1]
  "playoff"  → [1, 2, 3]
  "swift"    → [5, 6, n]
  "taylor"   → [5, 6, n]
```

Searching "playoff" = one lookup → `[1, 2, 3]`. No scanning! It also supports **geo queries** ("events near me") and dates, all combined in one query.

**Keeping Elasticsearch in sync** `(39:30)`

⚠️ Don't use Elasticsearch as your **main** database: it's weaker at durability and transactions. (He did it at his first startup and "learned the hard way".) Postgres stays the source of truth, so changes must be copied over:

| Option | How | Downside |
|---|---|---|
| **Dual write** in app code | Write to Postgres *and* Elasticsearch | What if one write fails? Need retry / rollback logic. |
| ⭐ **CDC** (Change Data Capture) | Every DB change goes onto a stream; a worker applies it to Elasticsearch | Elasticsearch has a writes/sec limit (it re-indexes on every write). |

For us CDC is fine: events/venues/performers **rarely change** (maybe hundreds per day), so no queue or batching is needed.

---

### 8.2 Deep dive: Caching popular searches

`(42:30)`

"Everyone is searching for *Taylor Swift*. Can it be even faster?" Key observation: **no personalisation**, so two users searching the same thing get the **same results**, which makes it cacheable.

```
╔═══════════╗     ┌──────────┐    ┌────────────┐    ┌────────────────┐    ┌───────────────┐
║ ★ CDN     ║────►│  Client  │───►│ API Gateway│───►│ Search Service │───►│ Elasticsearch │
║ caches    ║     └──────────┘    └────────────┘    └────────────────┘    │ ★ node query  │
║ GET       ║◄═══ client hits the CDN first;                               │   cache (LRU) │
║ /search   ║     on a miss it goes through to the gateway                 └───────────────┘
║ 30-60 s   ║
╚═══════════╝
```

| Option | How | Notes |
|---|---|---|
| **OpenSearch node query cache** | AWS's managed Elasticsearch caches the top ~10k queries per shard (LRU). Just turn it on. | Simple, fast. |
| **Redis / Memcached** | Key = normalised search term, value = results | Must invalidate when data changes. |
| ⭐ **CDN** (his pick) | Cache the `/search` API response at edge servers near the user for 30–60 s | Super fast, great for trending searches. |

**When the CDN cache stops helping** `(45:00)`:
- Too many query combinations (term + type + date + location) → few repeats → low hit rate, wasted space.
- Exact lat/long location → every user's query is unique → useless. ("San Francisco" is fine.)
- If we add **personalised** results later → can't share cached results between users.

---

### 8.3 Deep dive: A live seat map (SSE)

`(46:30)`

**Problem:** you load the seat map, it looks green 🟢. Seconds later, many seats are taken, but your screen doesn't know. You click a "free" seat → error. Bad experience, especially for hot events.

**Fix:** push seat changes to the client in real time.

```
┌──────────┐ ◄═══════════════════════════════════════╗
│  Client  │   ★ SSE: "seat A12 is now taken"        ║
└────┬─────┘                                          ║
     │ opens connection                               ║
     ▼                                       ┌────────╨─────────┐      ┌───────────┐
┌────────────┐                               │  Event Service   │◄────►│ Redis lock│
│ API Gateway│──────────────────────────────►│ ★ pushes seat    │      └───────────┘
└────────────┘                               │   status changes │◄────►┌───────────┐
                                             └──────────────────┘      │ PostgreSQL│
                                                                       └───────────┘
```

| ★ What's new | Why |
|---|---|
| **SSE connection** (server → client) | Whenever a seat becomes reserved/booked/available, the server pushes it to everyone viewing that event. |

**Options compared** `(48:00)`:

| Option | How it works | Use when |
|---|---|---|
| **Long polling** | Client sends a request; server holds it open 30–60 s until there's news; repeat in a loop | Users stay on the page **a few minutes**. Cheap, no extra infra. |
| **WebSockets** | Persistent **two-way** connection | Chat, games: both sides send data |
| ⭐ **SSE** (Server-Sent Events) | Persistent **one-way** connection, server → client | Users stay a long time and only the **server** needs to send updates ✅ our case |

```js
// Client side: React effect listening for seat updates
useEffect(() => {
  const source = new EventSource(`/events/${eventId}/seats/stream`)
  source.onmessage = (e) => {
    const { ticketId, status } = JSON.parse(e.data)
    setSeats((seats) => ({ ...seats, [ticketId]: status }))
  }
  return () => source.close() // close the connection on unmount
}, [eventId])
```

**But for Taylor Swift this isn't enough** `(50:30)`: 1 million people fight over 50k seats. With a live map, the user opens the page, sees green seats, and **within a second the whole map turns grey**. Live, but still a terrible experience, and our backend is hammered. ➡️ Next deep dive.

---

### 8.4 Deep dive: Surviving huge spikes with a Virtual Waiting Queue

`(51:00)`

**Idea:** add a **choke point** in front of booking. Don't let 1 million people in at once; let them in **in batches**.

```
┌──────────┐    ┌────────────┐    ╔═══════════════════════╗     ┌──────────────────┐
│  Client  │───►│ API Gateway│═══►║ ★ Virtual Waiting     ║════►│  Event Service   │
│ "You're  │    └────────────┘    ║   Queue               ║ let │  Booking Service │
│  #48,213 │                      ║ (Redis sorted set)    ║ 100 │  ...             │
│  in line"│◄═════════════════════║ score = arrival time  ║ in  └──────────────────┘
└──────────┘  ★ SSE: "your turn!" ╚═══════════════════════╝ at a time
```

| ★ What's new | Why |
|---|---|
| **Virtual Waiting Queue** | Protects the backend and gives users a **fair, calm** experience instead of a seat map that empties in a second. |
| **SSE "your turn" message** | Reuses the SSE connection from 8.3 to tell users they can enter. |

**How it works:**
1. An **admin turns the queue on** only for very popular events.
2. Users see *"Thanks for your interest. You're in the queue; we'll let you in soon."*
3. Users are stored in a **Redis sorted set** (a priority queue), ordered by arrival time. (Some systems **randomise** order so people close to the servers don't always win.)
4. When, say, 100 seats are booked, the **next 100 users** are taken out of the queue and given an access token.
5. They're notified over **SSE** and can now pick seats and book.

> 💡 *"The best answer is often not the most technically complex one. It's the one that solves the problem in a simple and maybe creative way."*

---

### 8.5 Deep dive: Scaling reads (cache + horizontal scaling + sharding)

`(53:30)`

Reads are ~100× writes, and events/venues/performers almost **never change**, so they are perfect to cache.

```
                                      ┌──────────────────┐      ╔═══════════════════════╗
                                ┌────►│  Event Service   │═════►║ ★ Redis cache         ║
┌──────────┐    ┌────────────┐  │     │  ★ ×N instances  │      ║ eventId → event +     ║
│  Client  │───►│ API Gateway│──┤     └────────┬─────────┘      ║   venue + performer   ║
└──────────┘    │ ★ load     │  │              │ tickets only   ╚═══════════════════════╝
                │  balancer  │  │              ▼  (they change!)
                └────────────┘  │     ┌──────────────────┐
                                └────►│  PostgreSQL      │
                                      │ ★ sharded by     │
                                      │   eventId        │
                                      └──────────────────┘
```

| ★ What's new | Why |
|---|---|
| **Redis cache** for event + venue + performer | Static data → cache it and skip the DB join. **Tickets are NOT cached**: they change all the time, so always read them fresh. Invalidate/update the cache when an admin edits an event. No LRU eviction needed if you cache all upcoming events. |
| **Load balancers + many instances** | Each service scales **horizontally** based on CPU/memory (e.g. a managed AWS API Gateway has this built in). |
| **Sharding Postgres** | Only if the data is too big for one machine. Shard by **`eventId`** (most queries use it), or by **`venueId`** if you spread data by region and people mostly search nearby. |

**About back-of-the-envelope math** `(54:30)`

He deliberately **skipped** the usual QPS/storage estimates at the start. Most candidates calculate numbers, say "wow, that's big", and learn nothing from it.

> ✅ **Only do math when the result changes a design decision.** Example: calculate Postgres storage size **here** to decide "do we need sharding or not?"

---

## 9. The Final Design (Everything Together)

```
                         ┌──────────┐
                         │   CDN    │ caches popular /search responses
                         └────┬─────┘
                              │
┌──────────────┐        ┌─────▼──────┐        ┌─────────────────────┐
│    Client    │◄──────►│ API Gateway│───────►│ Virtual Waiting     │ (only for hot events)
│ SSE: seats + │  SSE   │ auth, rate │        │ Queue (Redis ZSET)  │
│ "your turn"  │        │ limit, LB  │        └──────────┬──────────┘
└──────────────┘        └─────┬──────┘                   │
             ┌────────────────┼──────────────────────────┤
             ▼                ▼                          ▼
   ┌──────────────────┐ ┌──────────────────┐   ┌──────────────────┐       ┌────────┐
   │ Search Service   │ │ Event Service    │   │ Booking Service  │◄─────►│ Stripe │
   └────────┬─────────┘ └──┬────────┬──────┘   └───┬──────────┬───┘webhook└────────┘
            ▼              ▼        ▼              ▼          │
   ┌──────────────────┐ ┌───────┐ ┌──────────────────┐        │
   │  Elasticsearch   │ │ Redis │ │ Redis Ticket Lock│        │
   │ (inverted index, │ │ cache │ │ (TTL = 10 min)   │        │
   │  geo, query cache│ └───────┘ └──────────────────┘        │
   └────────▲─────────┘     ┌───────────────────────────┐     │
            └───── CDC ─────│ PostgreSQL (sharded)      │◄────┘
                            │ source of truth, ACID     │
                            └───────────────────────────┘
```

### ✅ Final check: does it meet every requirement?

| Requirement | How we meet it |
|---|---|
| Search events | Search Service + Elasticsearch |
| View event | Event Service + Redis cache + Postgres |
| Book ticket | Booking Service: Redis lock (reserve) → Stripe → Postgres (confirm) |
| No double booking (strong consistency) | Redis lock + ACID transaction in Postgres |
| High availability for search/view | Stateless services, horizontal scaling, caches, CDN |
| Huge spikes | Virtual waiting queue + horizontal scaling |
| Low-latency search | Elasticsearch + CDN / query cache |
| Reads ≫ writes | Redis cache for static event data, CDN |

> 🎯 **His verdict:** this design easily passes **mid-level**, passes **senior**, and possibly **staff**, depending on how well you answer follow-ups. At the end of *your* interview, always do this final check against your requirements out loud.

---

## 10. Interview Cheat Sheet

### One-line summary
> **Strong consistency for booking, availability for browsing, a Redis TTL lock for seat holds, Elasticsearch for search, SSE for a live seat map, and a virtual queue for traffic spikes.**

### What separates the levels

| Topic | Mid-level | Senior / Staff |
|---|---|---|
| CAP | "Consistency" | "Consistency for booking, availability for search/view" |
| Expired holds | Cron job | Redis distributed lock with TTL (+ knows what happens if Redis dies) |
| Database choice | Long SQL vs NoSQL debate | "These are the properties I need; both work; I pick X" |
| Math | Calculates numbers at the start for no reason | Calculates only when it changes a decision |
| Hot events | Doesn't notice | Virtual waiting queue |

### Common interview questions from this design

**Q: Why not just put `userId` in the booking request body?**
A: It can be faked: a user could book or cancel seats as someone else. Read the user from the verified JWT/session in the header.

**Q: Why is booking two steps?**
A: The user needs time to pay. We **hold** the seat (reserve) for 10 minutes so nobody else takes it while they type their card, then **confirm** after payment succeeds.

**Q: Why a *distributed* lock and not an in-memory one?**
A: The Booking Service runs on many servers. They all need one shared view of which seats are held, so the lock lives in a shared Redis.

**Q: What does TTL mean?**
A: Time-to-live. Redis deletes the key automatically after the given time, so a hold expires exactly after 10 minutes with no cron job.

**Q: Why not use Elasticsearch as the main database?**
A: It's built for search, not for durability or transactions. Keep Postgres as the source of truth and copy changes to Elasticsearch with CDC.

**Q: SSE vs WebSocket vs long polling?**
A: Long polling: simple, fine for short visits. WebSocket: two-way (chat). SSE: one-way server → client, perfect when only the server sends updates, like seat changes.

**Q: Why not cache tickets in Redis like events?**
A: Ticket availability changes every second during a sale. A cached copy would be stale and cause errors. Cache only data that rarely changes (event, venue, performer).

**Q: How does the virtual queue help?**
A: It's a choke point. Instead of a million users hitting booking at once (crashing servers and seeing an instantly empty seat map), users wait in line and are let in in batches as seats sell.
