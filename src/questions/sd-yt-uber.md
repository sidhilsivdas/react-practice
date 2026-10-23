> Notes and a step-by-step explanation of the video **"Design Uber w/ a Ex-Meta Staff Engineer: System Design Interview breakdown"** by *Hello Interview* (63 min).
> Video: https://www.youtube.com/watch?v=lsKU38RKQSo
>
> Timestamps like `(12:00)` point to the place in the video where each topic is covered.
> This is the 2nd video in the series. Many ideas (distributed lock with TTL, cron job vs lock) come from the **Ticketmaster** video. Read that one first if you haven't.

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

**Uber** (or Ola in India): a rider opens the app, sees a price, requests a ride, and a **nearby driver** is matched in seconds.

He calls this *"the hardest and most interesting of the **proximity search** problems"*. Proximity search = "find things **near** a location". If you can design Uber, you can also design:

- **Yelp / Google Maps "restaurants near me"**
- **Find My Friends**
- Any "nearby X" feature

Asked a lot at **Tesla, Google and Meta**.

> 💡 **The two hard parts of this problem:**
> 1. Finding nearby drivers **fast**, while millions of drivers send their location every few seconds.
> 2. Making sure a driver **never gets two ride requests at once**, and a ride never goes to two drivers.

---

## 2. The Interview Roadmap

`(1:50)`

Same roadmap as Ticketmaster: each step builds on the one before it.

```
 ① Requirements  ──►  ② Core Entities  ──►  ③ API  ──►  ④ High-Level Design  ──►  ⑤ Deep Dives
  (features +          (what data)         (endpoints)   (satisfy the             (satisfy the
   qualities)                                             FUNCTIONAL reqs)         NON-functional reqs)
```

> 💡 **Key rule:** high-level design = make every **feature** work. Deep dives = make it meet every **quality** (fast, consistent, scalable).

---

## 3. Step ①a: Functional Requirements (Features)

`(3:00)`

Written as *"Users should be able to…"*. Think about what happens when **you** open the Uber app:

1. ✅ Rider enters **pickup + destination** → gets a **fare estimate** ("UberX: ₹320")
2. ✅ Rider **requests a ride** → gets matched with a **nearby available driver** in real time
3. ✅ Driver can **accept / decline** the request, then **navigate** to pickup and drop-off

**Out of scope** (say these out loud, it shows product thinking + focus):
- Multiple car types (we only do UberX)
- Ratings for drivers and riders
- Scheduling a ride in advance

> ⚠️ Interviews move fast (about **35 minutes** of real design time). Focus on **at most 3 core features**; put everything else out of scope.

---

## 4. Step ①b: Non-Functional Requirements (Qualities)

`(6:00)`

> ⚠️ **Common mistake:** rushing this part and writing buzzwords ("scalable, available"). These requirements **decide your deep dives later**, so for senior/staff they are super important.

His 3 rules: **(A)** pick qualities that are unique to *this* system, **(B)** put them in this system's context, **(C)** add numbers if possible.

| Quality | In Uber's context | Number |
|---|---|---|
| **Low latency** | Low-latency **matching** | Match in **< 1 minute**, or show "no drivers available" |
| **Consistency** (CAP) | Consistency of **matching**: 1 ride ↔ 1 driver | Never send one driver many requests at once |
| **Availability** | Highly available **outside** of matching | 24/7, minimal downtime |
| **High throughput** | **Surges** at peak hours / events (concert ends, New Year's Eve) | **100,000s of requests** in one region |

Notice the **CAP split** again (same as Ticketmaster): **consistency** where correctness matters (matching), **availability** everywhere else.

**Out of scope:** GDPR / privacy, monitoring / logging / alerting, CI/CD, deep failure handling.

### 🧮 What about back-of-the-envelope math? `(10:20)`

He **skips it here on purpose**. Most candidates calculate users, storage, bandwidth… then say *"OK, it's a lot"* and move on, learning nothing they didn't already know.

> ✅ Say this to the interviewer: *"I'd like to skip estimations for now and do them during the design, when the result will directly change a decision. Is that OK?"* 99.9% will say yes.

He does exactly this later in the deep dive (600k TPS calculation, section 8.1).

### ✍️ Final list

```
Functional                              Non-functional
──────────────────────                  ──────────────────────────────────────────────
• Get a fare estimate                   • Low-latency matching (< 1 min or fail)
• Request a ride → match a driver       • Consistency of matching (1 ride ↔ 1 driver)
• Driver accept/deny + navigate         • Highly available outside matching
                                        • Handle surges (100k+ requests per region)
```

---

## 5. Step ②: Core Entities

`(12:00)`

Just name the "things" we store. **No full columns yet**: you'll fill them in during the high-level design, when you actually know what's needed.

| Entity | What it is |
|---|---|
| **Ride** | One trip: rider, driver, source, destination, fare, ETA, status |
| **Rider** | The passenger (metadata, payment info…) |
| **Driver** | The driver (car, licence plate, **status**) |
| **Location** | The **current** position of every driver, so we can quickly find who is nearby ⭐ less obvious, but key! |

---

## 6. Step ③: The API

`(13:20)`

Go through the functional requirements **one by one** and write the endpoint(s) for each.

### Feature 1: Fare estimate

```http
POST /ride/fare-estimate
Body: { source, destination }
→ Partial<Ride>  { rideId, eta, price }
```

`POST` because it **creates** a new Ride row (status `fare_estimated`). Even if the user never books, that data is useful for analytics.

### Feature 2: Request a ride

```http
PATCH /ride/request
Body: { rideId }
→ 200 OK   (matching happens asynchronously, can take up to 1 min)
```

`PATCH` because it updates the **same** Ride row.

To match, we need to know where drivers are, so we need one more endpoint:

```http
POST /location/update          ← drivers call this every few seconds
Body: { lat, long }
```

> 💡 Many candidates miss this endpoint at first. **That's fine**: the API list is a "moving model". Add to it whenever the design shows you need something.

### Feature 3: Driver accepts / navigates

```http
PATCH /ride/driver/accept
Body: { rideId, accept: true | false }

PATCH /ride/driver/update
Body: { rideId, status: 'picked_up' | 'dropped_off' }
→ { lat, long } of the next place to go   (or null when the ride is finished)
```

### Two senior-level tips `(18:50)`

**1. Don't write obvious data types.** Writing `lat: number, rideId: string, accept: boolean` wastes your limited time; the interviewer knows these. Only spell out something unusual, like an **enum** (`status`).
*(Mid-level/junior candidates: writing types is fine.)*

**2. No `userId` / `driverId` in the body.** 🔒 The user comes from the **JWT / session token in the header**. Otherwise anyone could request a ride *as another user* by changing the ID in the body.

---

## 7. Step ④: High-Level Design, Built Up Piece by Piece

`(21:00)`

We go **API by API**. If every API works, every feature works (because the APIs came from the features).

### 7.1 API "Get a fare estimate"

`(21:30)`

```
                                                    ╔═════════════════════╗
                                                    ║ ★ 3rd-party Mapping ║
                                                    ║   (Google Maps API) ║
                                                    ╚══════════╤══════════╝
                                                               ║ ETA with traffic
╔════════════╗      ╔═══════════════════╗      ╔═══════════════╧══╗      ╔══════════════════╗
║ ★ Rider    ║═════►║ ★ API Gateway     ║═════►║ ★ Ride Service   ║═════►║ ★ Primary DB     ║
║   client   ║      ║   (AWS managed)   ║      ║   fare estimates ║      ║ Ride:            ║
║ iOS/Android║      ║ routing, LB, auth,║      ╚══════════════════╝      ║  id, riderId,    ║
╚════════════╝      ║ SSL, rate limit   ║                                ║  fare, eta,      ║
                    ╚═══════════════════╝                                ║  source, dest,   ║
                                                                         ║  status          ║
                                                                         ╚══════════════════╝
```

| ★ What's new | Why |
|---|---|
| **Rider client** | iOS / Android app (no web). |
| **API Gateway** | One front door. Most important job: **routing** each request to the right microservice. Also load balancing, authentication, SSL termination, rate limiting. *(Mention these, but don't get distracted.)* |
| **Ride Service** | Handles fare estimates. |
| **3rd-party mapping** | Real Uber uses a complex ML model. In the interview, **simplify and say so**: call Google Maps for the ETA in current traffic, then price ≈ ETA × some rate. |
| **Primary DB** + **Ride** table | Save the estimate. `status = 'fare_estimated'`. |

> 💡 **Fill in table columns NOW**, whenever an arrow lands on the database. Ask: *"does this request need a new field?"* Unimportant tables (like Rider) can just be `id, ...metadata`. Writing `...` keeps you from getting distracted.

**Flow:** rider sends source + destination → Ride Service asks Google Maps for ETA → calculates price → saves Ride row → returns `{ rideId, fare, eta }`.

---

### 7.2 API "Request a ride" (matching + driver locations)

`(26:30)`

```
                                                    ┌─────────────────────┐
                                                    │ 3rd-party Mapping   │
                                                    └──────────┬──────────┘
┌────────────┐      ┌───────────────────┐      ┌───────────────┴──┐      ┌──────────────────┐
│   Rider    │─────►│   API Gateway     │─────►│  Ride Service    │─────►│   Primary DB     │
│   client   │      │                   │      └──────────────────┘      │ Ride  ...        │
└────────────┘      │                   │      ╔══════════════════╗      │ ★ Driver:        │
                    │                   │═════►║ ★ Ride Matching  ║═════►│   id, ...meta,   │
╔════════════╗      │                   │      ║   Service        ║ get  │   status:        │
║ ★ Driver   ║═════►│                   │      ╚════════╤═════════╝status│   in_ride |      │
║   client   ║ every└─────────┬─────────┘               ║ get drivers    │   offline |      │
║ (sends GPS)║ 5 sec          ║                         ║ within N miles │   available      │
╚════════════╝                ║                         ▼                └──────────────────┘
                    ╔═════════▼═════════╗      ╔══════════════════╗
                    ║ ★ Location        ║═════►║ ★ Location DB    ║
                    ║   Service         ║update║ driver → lat/long║
                    ╚═══════════════════╝      ╚══════════════════╝
```

| ★ What's new | Why |
|---|---|
| **Ride Matching Service** | Matches riders with drivers. **Separate** from Ride Service because matching is **heavy** and **asynchronous** (waits for drivers to respond), so it must **scale independently** and can be owned by a different team. |
| **Location DB** | Stores each driver's **current** location. Matching asks: *"all drivers within N miles of the rider"*. |
| **Driver client** | Driver's app sends `POST /location/update` every **5 seconds**. |
| **Location Service** | Receives those updates and writes them to the Location DB. |
| **Driver table** (`status`) | Matching must skip drivers who are `offline` or already `in_ride`. Only `available` ones get a request. |

**Flow:** rider taps "Request" → Matching Service gets drivers near the rider from Location DB → filters out busy/offline drivers using the Driver table → now has a list of eligible drivers.

---

### 7.3 API "Driver accepts + navigates"

`(30:00)`

```
                    ┌───────────────────┐      ┌──────────────────┐      ┌──────────────────┐
┌────────────┐      │   API Gateway     │═════►│  Ride Service    │═════►│   Primary DB     │
│   Rider    │─────►│                   │★     └──────────────────┘★     │ Ride:            │
└────────────┘      │                   │accept / update           write │  + ★ driverId?   │
                    │                   │      ┌──────────────────┐      │  status: fare_   │
┌────────────┐      │                   │─────►│ Ride Matching    │─────►│  estimated |     │
│   Driver   │═════►│                   │      │ Service          │      │  ★ matched | ... │
│   client   │      └───────────────────┘      └────────┬─────────┘      └──────────────────┘
└─────▲──────┘                                          ║ "send this ride
      ║                                                 ║  to driver X"
      ║ ★ push: "Accept this ride?"            ╔════════▼══════════╗
      ╚════════════════════════════════════════║ ★ Notification    ║
                                               ║   Service         ║
                                               ║ (APNs / Firebase) ║
                                               ╚═══════════════════╝
         (Location Service + Location DB unchanged; hidden to keep the picture small)
```

| ★ What's new | Why |
|---|---|
| **Notification Service** | Matching needs to **ask** the driver. Uses native push: **APNs** (Apple) and **Firebase** (Android). It's its own interview question, so **black-box it**. |
| **accept / update → Ride Service** | Driver taps "Accept" → `PATCH /ride/driver/accept`. Later taps "Picked up" / "Dropped off" → `PATCH /ride/driver/update`. |
| **`driverId?`** on Ride | Optional: only set once a driver accepts. |
| **More `status` values** | `fare_estimated → matched → picked_up → dropped_off`. |

**Navigation flow:** driver calls `update(picked_up)` → we save it and return the **destination's lat/long**. Driver calls `update(dropped_off)` → return `null`, nowhere else to go.

### ✅ Check: are all functional requirements met?

```
Fare estimate              ✅  Ride Service + Google Maps + Primary DB
Request ride + match       ✅  Ride Matching Service + Location DB + Notification Service
Driver accept + navigate   ✅  accept / update endpoints → Ride Service
```

It's **simple**, and it doesn't yet answer the hard questions: *"How does the Location DB find nearby drivers fast?"* and *"How do we stop double matching?"* That's what the deep dives are for.

---

## 8. Step ⑤: Deep Dives

`(33:00)`

**What each level is expected to show:**

| Level | Expectation |
|---|---|
| **Mid-level** | The high-level design above is *close to* passing. Answer the interviewer's follow-ups reasonably. |
| **Senior** | Go **deep in ~2 places** to meet the non-functional requirements. |
| **Staff** | Go **deeper**, in **~3 places**. Often you **teach the interviewer something** (e.g. deep DynamoDB knowledge from your own experience). |

**How to pick deep dives:** go through your non-functional requirements **one by one**.

---

### 8.1 Deep dive: Low-latency matching → making the Location DB fast ⭐ the core of this problem

`(34:30)`

The location path needs two things:
1. **Fast proximity queries:** "drivers within N miles" must be quick.
2. **Huge write volume:** lots of location updates.

**Now** is the right time to do math, because the answer changes the design:

```
6,000,000 drivers  ×  ~50% active   =  3,000,000 active drivers
3,000,000 updates  ÷  every 5 sec   =  600,000 writes per second (TPS) 😱
```

He shows **3 options, from bad to best**:

#### ❌ Option 1: Plain Postgres with `lat` and `long` columns `(36:20)`

```sql
SELECT * FROM drivers
WHERE lat  BETWEEN :minLat  AND :maxLat
  AND long BETWEEN :minLong AND :maxLong;
```

Why it's bad:
- Normal indexes are **B-trees**, built for **1-dimensional** data. A location is **2-dimensional** (lat + long), so queries are slow.
- A wide search (20 miles) **scans lots of rows**.
- Postgres handles about **2k–4k TPS**. We need **600k**. Way off.

*Even for mid-level, he'd push back on this.*

#### 😐 Option 2: Postgres + PostGIS (quadtree index) + a batching queue `(38:10)`

**Fix the slow query → geospatial index.** A geospatial index makes "find things near X" fast. Postgres gets one through the **PostGIS** extension, which uses a **quadtree**.

**How a quadtree works** (`k = 5` = max drivers per cell before splitting):

```
 Split the map into 4. Any cell with MORE than k drivers splits into 4 again.

 ┌──────────────┬──────┬──────┐                      (root)
 │ •            │ • •  │ • •  │                 ┌──────┼──────┬──────┐
 │      •       │  •   │   •  │                red   green   blue   orange
 │  •           ├──┬───┼──────┤                (3)    (2)     │      (4)
 │  3 drivers   │••│ • │ •  • │                           ┌──┬─┴─┬──┐
 │  → no split  ├──┼───┤  •   │                         4 cells (one with
 ├──────────────┼──┴───┴──────┤                         >5 drivers splits
 │              │   •      •  │                         again into 4)
 │    •    •    │       •     │
 │  2 drivers   │          •  │   Dense city areas → deep tree
 │              │  4 drivers  │   Empty ocean     → one big leaf
 └──────────────┴─────────────┘
```

To search: walk down the tree to the leaf for the rider's location → that leaf **is** the list of nearby drivers.

**Fix the write volume → a queue that batches writes:**

```
600k updates/sec ──► ╔═══════════════╗ ──► write in big batches ──► Postgres (~4k TPS)
                     ║ ★ Queue       ║
                     ╚═══════════════╝
```

Downsides:
- ⏱️ **Latency:** you wait to collect big batches → locations are **out of date**.
- 🌳 **Re-indexing:** every batch reshapes the quadtree, which is expensive and uses lots of memory.

*OK for mid-level (passing) and maybe senior. He'd point out the limits and hope you go further.*

#### ⭐ Option 3: Redis with geohashing `(41:50)`

```
                                              ┌──────────────────┐
                                     ┌───────►│ Ride Matching    │
                                     │        │ Service          │
┌────────────┐     ┌─────────────┐   │        └────────┬─────────┘
│   Driver   │────►│ API Gateway │───┤                 │ GEOSEARCH within N miles
└────────────┘     └─────────────┘   │                 ▼
                                     │        ╔══════════════════════╗
                                     │        ║ ★ Location DB =      ║
                                     │        ║   REDIS (in-memory)  ║
                                     └───────►║ ★ geohash index      ║
                         ┌──────────────────┐ ║ 100k – 1M TPS ✅     ║
                         │ Location Service │═╝                      ║
                         └──────────────────┘ ╚══════════════════════╝
                                 (no queue needed anymore ✅)
```

| ★ What's new | Why |
|---|---|
| **Redis** as the Location DB | **In-memory** → a Redis cluster handles **100k to ~1M TPS**. Our 600k fits; no queue needed. |
| **Geohash** index | Built into Redis. Fast proximity search **without** maintaining a separate tree. |

**How geohashing works** `(42:30)`

```
 Layer 1: split into 4     Layer 2: split each cell into 4 again   Layer 3: ... keep going

 ┌─────┬─────┐             ┌────┬────┬────┬────┐
 │  0  │  1  │             │ 00 │ 01 │ 10 │ 11 │
 ├─────┼─────┤     ──►     ├────┼────┼────┼────┤      "2" → "20","21","22","23"
 │  2  │  3  │             │ 02 │ 03 │ 12 │ 13 │      "20" → "200","201","202","203"
 └─────┴─────┘             ├────┼────┼────┼────┤
                           │ 20 │ 21 │ 30 │ 31 │
                           ├────┼────┼────┼────┤
                           │ 22 │ 23 │ 32 │ 33 │
                           └────┴────┴────┴────┘

 Real geohash: a base-32 string like  "u4pruydqqvj"
   longer string  = smaller box = more precise
   same prefix    = nearby (e.g. "u4pr..." and "u4pq..." are close)
```

- Splitting does **not** depend on how many drivers are in a cell. It keeps splitting **evenly** until the precision you want.
- A location is **just a string** → cheap to compute, easy to store, no tree to rebuild on every update.

```js
// Location Service: driver sends an update (Redis has geo commands built in)
await redis.geoAdd('drivers', { longitude: 77.59, latitude: 12.97, member: 'driver:42' })

// Ride Matching Service: find drivers within 2 km of the rider
const nearby = await redis.geoSearch(
  'drivers',
  { longitude: riderLng, latitude: riderLat },
  { radius: 2, unit: 'km' }
)
```

#### 🥊 Quadtree vs Geohash: the trade-off to remember `(44:00)`

| | **Quadtree** | **Geohash** |
|---|---|---|
| How it splits | Based on **density** (split crowded cells more) | **Even** grid, fixed precision |
| Best when | Locations are **uneven** and **rarely change** | Locations **change very often** |
| Example | **Yelp**: dense NYC, empty ocean, restaurants don't move | **Uber**: every driver moves every few seconds |
| Downside | Re-indexing the tree on updates is expensive; more memory | Less smart for uneven density; edge-of-box issues (neighbours may not share a prefix) |
| Where | Postgres + **PostGIS** | **Redis** (built in) |

> 🎯 Driver locations *are* unevenly spread, but the **huge write frequency** makes **geohash** the winner for Uber.
> Fun fact: Uber built its own hexagon-based grid (**H3**). Hexagons are more "circle-like": the distance from the centre to every edge is the same.

If you know these two and can explain this trade-off, *"you're totally set"* for any proximity question.

#### 📉 Bonus: reduce the 600k TPS in the first place `(46:30)`

The interviewer may ask: *"Do we really need 600k writes/sec?"*

- **Simple:** send every 10–20 sec instead of 5 (trade a little accuracy).
- ⭐ **Smarter: dynamic location updates** in the driver app. The app decides how often to send, based on:
  - **Status:** not accepting rides → no updates needed.
  - **Speed:** parked for 20 min → location isn't changing.
  - **Nearby demand:** out in the countryside → less precision needed.

This could bring 600k down to ~100k or less.

---

### 8.2 Deep dive: Consistency of matching (no double requests)

`(48:00)`

Two rules:

```
1. Never send ONE ride to MORE THAN ONE driver at a time.     ← easy
2. Never send ONE driver MORE THAN ONE request at a time.     ← hard
```

#### Rule 1 is easy

Each ride is handled by **one** matching server, so a simple loop on that server is enough:

```js
// inside Ride Matching Service, for ONE ride
while (!matched) {
  const driver = nextDriver()      // next closest from the Location DB list
  lockDriver(driver)               // (rule 2, see below)
  sendNotification(driver)         // "Accept this ride?"
  await wait(10_000)               // give them ~10 sec to respond
}
```

#### Rule 2 is hard: many servers, same driver `(49:30)`

The matching service runs on **many servers**. A concert ends → 100k ride requests land on different servers → they **all** find that driver #1 is the closest:

```
 Server A ──► "driver 1 is closest!" ──┐
 Server B ──► "driver 1 is closest!" ──┼──►  📱 driver 1 gets 100 requests at once 😱
 Server C ──► "driver 1 is closest!" ──┘
```

One server can't fix this alone; the servers need **shared state**. Three options:

**❌ Option 1: a `request_sent` status on the Driver row.** Set it (atomically) before notifying; other servers skip drivers in that status. **Problem:** if the driver **ignores** the request (they're driving, not touching the phone), the status is **stuck forever**. Nobody can send them a ride again.

**😐 Option 2: plus a cron job** that resets `request_sent` → `available` after 10 sec (needs a `statusUpdatedAt` column).
**Problem:** if the cron runs every minute but the lock should last 5 sec, a driver can stay blocked up to **55 extra seconds**. Bad when it's busy.
*Fine for mid-level, maybe senior. Not enough for staff.*

**⭐ Option 3: a distributed lock with TTL** `(54:00)` (exactly like Ticketmaster's seat lock)

```
                    ┌──────────────────┐   ★ 1. "is driver 1 locked?"   ╔═══════════════════════╗
  Server A ────────►│ Ride Matching    │═══════════════════════════════►║ ★ Driver Lock (TTL)   ║
  Server B ────────►│ Service (×N)     │   ★ 2. if not: lock it         ║ driverId → true       ║
  Server C ────────►│                  │       for 10 sec               ║ auto-deleted after    ║
                    └────────┬─────────┘                                ║ TTL ⏱️                ║
                             │ 3. only then notify                      ╚═══════════════════════╝
                             ▼                                           (Redis, or a DynamoDB
                    ┌──────────────────┐                                  table with TTL)
                    │ Notification Svc │
                    └──────────────────┘
```

| ★ What's new | Why |
|---|---|
| **Driver Lock** with **TTL** | Key = `driverId`, expires automatically after ~10 sec. **Every** matching server checks it first → one shared, consistent view of who's busy. If the driver ignores the request, the lock **disappears by itself**: no stuck status, no cron job, no delay. |

```js
// NX = only set if not already locked, EX = auto-expire after 10 s
const gotLock = await redis.set(`lock:driver:${driverId}`, rideId, { NX: true, EX: 10 })
if (!gotLock) continue // someone else is asking this driver → try the next one
await sendNotification(driverId, rideId)
```

#### 🔄 Design update: switch the Primary DB to DynamoDB `(55:50)`

He then says the lock doesn't need its own Redis. Make the **Primary DB DynamoDB**:
- Not many relationships between tables.
- Highly available, scales almost without limit.
- Supports **TTL on rows** → add a `DriverLock` table (`driverId`) with TTL.

✅ One less technology to run. *(Redis is still used for the Location DB.)*

---

### 8.3 Deep dive: Surges at popular events

`(57:30)`

**Problem:** a concert ends, 100k riders request at once. Matching servers can't **auto-scale fast enough**, so requests get dropped.

```
┌────────────┐     ┌─────────────┐     ╔═══════════════════════╗     ┌──────────────────┐
│   Rider    │────►│ API Gateway │════►║ ★ Ride Request Queue  ║════►│ Ride Matching    │
└────────────┘     └─────────────┘     ║ ★ partitioned by      ║pull │ Service (×N)     │
                                       ║   REGION              ║when │                  │
                                       ║ [Manhattan] ■■■■■     ║ready└──────────────────┘
                                       ║ [Brooklyn ] ■■        ║
                                       ║ [Suburbs  ] ■         ║
                                       ╚═══════════════════════╝
```

| ★ What's new | Why |
|---|---|
| **Ride Request Queue** | A **buffer**: requests wait in the queue; matching servers pull work when ready. A surge no longer crashes them. |
| **Partitioned by region** | With one plain FIFO queue, a hard-to-match ride in the countryside (no drivers nearby) would **block** easy rides in Manhattan behind it. Per-region queues fix that. |
| **Retry for free** | Matching takes a while (waiting ~10 sec per driver), so a server may crash mid-match. The message was never **acknowledged**, so it goes back on the queue and another server picks it up. |

---

### 8.4 Deep dive: High availability outside matching

`(60:00)`

The "standard" answer:
- Every service scales **horizontally** behind its own load balancer.
- DynamoDB scales on its own; Redis cluster handles 100k–1M TPS.

Plus a bigger idea: **split by geography.**

```
╔═══════════════════════╗   ╔═══════════════════════╗   ╔═══════════════════════╗
║ ★ Northeast data      ║   ║ ★ Southwest data      ║   ║ ★ Northwest data      ║
║   center (New York)   ║   ║   center (California) ║   ║   center (Seattle)    ║
║ full copy of the whole║   ║ full copy of the whole║   ║ full copy of the whole║
║ system above          ║   ║ system above          ║   ║ system above          ║
╚═══════════════════════╝   ╚═══════════════════════╝   ╚═══════════════════════╝
      Users who travel (NY → CA): their user data is replicated to every region
```

Why: a ride is always **local** (a rider in New York never needs a driver in California). Splitting by region means **less load** per data center, **better availability** (one region down ≠ whole world down), and **cleaner queue partitioning**.

---

## 9. The Final Design (Everything Together)

`(61:00)`: this matches his final whiteboard.

```
                                                 ┌─────────────────┐
                                                 │ 3rd-party Maps  │
                                                 └────────┬────────┘
┌─────────────┐     ┌──────────────────┐        ┌─────────┴────────┐       ┌──────────────────────┐
│   Rider     │────►│ AWS API Gateway  │───────►│  Ride Service    │──────►│  Primary DB          │
│ iOS/Android │     │ routing, LB,     │        │  fare estimates  │       │  (DynamoDB)          │
└─────────────┘     │ auth, SSL,       │        └──────────────────┘       │  Ride, Rider, Driver │
                    │ rate limiting    │        ┌──────────────┐           │  DriverLock (TTL) 🔒 │
┌─────────────┐     │                  │───────►│ Ride Request │           └──────────▲───────────┘
│   Driver    │────►│                  │        │ Queue        │                      │ lock driver,
│ dynamic     │     │                  │        │ (by region)  │                      │ get status
│ location    │     └────────┬─────────┘        └──────┬───────┘                      │
│ updates     │              │                         ▼                              │
└──────▲──────┘              │              ┌──────────────────────┐                  │
       │                     │              │ Ride Matching Service│──────────────────┘
       │ push                │              └───┬──────────────┬───┘
       │ "accept?"           ▼                  │ nearby       │ notify
       │          ┌──────────────────┐          ▼ drivers      ▼
       │          │ Location Service │   ┌──────────────┐  ┌──────────────────────┐
       │          └────────┬─────────┘   │ Location DB  │  │ Notification Service │
       │                   └────────────►│ Redis +      │  │ (APNs / Firebase)    │
       │                    update       │ geohash      │  └──────────┬───────────┘
       │                                 │ 100k–1M TPS  │             │
       │                                 └──────────────┘             │
       └──────────────────────────────────────────────────────────────┘

       × copied per region: Northeast, Southwest, Northwest data centers
```

### ✅ Final check: does it meet every requirement?

| Requirement | How we meet it |
|---|---|
| Fare estimate | Ride Service + 3rd-party maps + Primary DB |
| Request + match | Ride Request Queue → Ride Matching Service + Location DB |
| Driver accept + navigate | Notification Service (push) → accept/update → Ride Service |
| Low-latency matching (< 1 min) | Redis + geohash for fast "nearby drivers", dynamic location updates |
| Consistency of matching | One loop per ride (rule 1) + Driver Lock with TTL (rule 2) |
| High availability outside matching | Horizontal scaling, DynamoDB, per-region deployments |
| Surges (100k+ requests) | Ride Request Queue partitioned by region |

---

## 10. Interview Cheat Sheet

### One-line summary
> **Redis + geohash for fast nearby-driver search, a TTL distributed lock so no driver gets two requests, a region-partitioned queue for surges, and per-region deployments for availability.**

### What separates the levels (he says this at the end, 61:30)

| Topic | Mid-level (passing) | Senior / Staff |
|---|---|---|
| Location DB | Postgres + PostGIS/quadtree + batching queue | Redis + geohash, explains quadtree vs geohash trade-off |
| Write volume | Accepts 600k TPS | Dynamic location updates on the client |
| Driver double-requests | `request_sent` status + cron job | Distributed lock with TTL |
| Depth | Answers follow-ups | Senior: ~2 deep dives. Staff: ~3, deeper, maybe teaches the interviewer |

> *"Senior candidates, even if you landed on the cron job, or the queue with PostGIS and quadtrees… very likely a hire."* Don't feel overwhelmed: the video covers **more** than any single interview needs.

### Same patterns as Ticketmaster 🔁

| Pattern | Ticketmaster | Uber |
|---|---|---|
| CAP split | Consistent booking, available search | Consistent matching, available everything else |
| Thing that must not be double-assigned | A **seat** | A **driver** |
| Lock with TTL | Seat held **10 min** | Driver locked **~10 sec** |
| Cron job = mid-level answer | Seat stuck up to 19 min | Driver stuck up to 55 sec extra |
| Surge handling | Virtual waiting queue | Ride request queue (by region) |
| Math | Only when it changes a decision | 600k TPS → rules out Postgres |

### Common interview questions from this design

**Q: Why can't we use a normal SQL index for "drivers near me"?**
A: B-tree indexes work on one dimension. Lat/long is two-dimensional, so range queries on both are slow and scan lots of rows. You need a **geospatial index** (quadtree, geohash).

**Q: Quadtree or geohash?**
A: Quadtree adapts to density, great for uneven data that rarely changes (Yelp). Geohash is an even grid stored as a simple string, great for very frequent updates (Uber). Uber → geohash.

**Q: How does a geohash find nearby things?**
A: Each location becomes a string; nearby locations share the same **prefix**. Shorter prefix = bigger area. So "nearby" becomes "same prefix" (plus checking neighbouring cells for edge cases).

**Q: Why Redis for locations?**
A: It's in-memory: a cluster handles 100k–1M writes/sec (we need ~600k) and it has geohash search built in. Postgres only does ~2–4k TPS.

**Q: How do you stop a driver from getting 100 requests at once?**
A: A distributed lock with a TTL (Redis `SET NX EX`, or a DynamoDB table with TTL). Every matching server checks/sets the lock before notifying. If the driver ignores it, the lock expires automatically.

**Q: Why not a cron job to unlock drivers?**
A: There's a delay between "should be free" and "cron runs". With a 1-min cron and a 5-sec lock, a driver may be blocked ~55 extra seconds. TTL expiry is instant.

**Q: Why put a queue in front of matching?**
A: To absorb surges (servers can't scale up instantly) and to retry automatically if a matching server crashes. Partition it by **region** so slow rural matches don't block city riders.

**Q: How can we reduce location update traffic?**
A: Dynamic updates on the driver's app: no updates when offline or parked, fewer updates in quiet areas, more when near ride demand.
