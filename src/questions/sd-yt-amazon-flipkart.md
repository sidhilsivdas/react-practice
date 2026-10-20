> Notes and an explanation of the video **"16: Amazon/Flipkart | Systems Design Interview Questions With Ex-Google SWE"** by *Jordan has no life* (37 min).
> Video: https://www.youtube.com/watch?v=F9lcK1jnAcs
>
> Timestamps like `(12:00)` point to the place in the video where each topic is covered.

---

## 1. What Are We Building?

`(0:30)`

A simple version of **Amazon** (or **Flipkart** in India). A user can:

1. **Search** for a product
2. **View** a product (price, images, "In stock" or not)
3. **Add it to the cart**
4. **Place an order**

That's it. This sounds easy, but at Amazon's scale (millions of users, a billion products) every one of these steps becomes a hard engineering problem.

> 💡 **Key idea of the whole video:** He deliberately *pretends* everything is under extreme load ("10 bajillion users editing everything at once") so he can practise the **fundamentals** of system design. In real life some of these problems are smaller, but interviewers want to see that you can handle the worst case.

---

## 2. Step 1: Requirements (What's In, What's Out)

`(1:00)`

In an interview, **always start by saying what you will and won't build.** It keeps the discussion focused.

| ✅ In scope (we'll design these) | ❌ Out of scope (skipped) |
|---|---|
| Products database | Reviews (similar to a Yelp design) |
| Cart service | Payments (deserves its own video) |
| Orders + inventory (stock) | AWS / cloud stuff |
| Fast reads (cache, search) | Customer service for users/sellers |

---

## 3. Step 2: Capacity Estimates (Back-of-the-Envelope Math)

`(2:00)`

These numbers are rough guesses. Interviewers don't want exact numbers; they want to see that you **reason about scale**.

### Products
- Amazon has ~350 million products → **round up to 1 billion** (design for growth).
- Guess **~1 MB of data per product** (description, details, etc.).
- `1 billion × 1 MB = ~1 petabyte (PB)` of data.

👉 **Conclusion:** 1 PB can't fit on one machine. We must **partition** (split) the products database across many machines.

### Orders
- ~10 million orders per day.
- `10,000,000 ÷ 24 ÷ 60 ÷ 60 ≈ 100 orders per second`.

👉 **Conclusion:** 100/sec is actually not much, especially since orders are for *different* products and land on different databases. But we'll still design as if it were huge.

### Images
- Every product has images, which are big files.

👉 **Conclusion:** Store images in **S3** (cheap file storage) and serve them through a **CDN** (servers spread around the world, close to users).

---

## 4. Step 3: The Big Goal: Fast Reads

`(3:40)`

> "Even 100 milliseconds of delay can hurt conversion rates."

**Conversion rate** = how many visitors actually buy something. On e-commerce sites, **slower pages mean fewer sales.** So the #1 priority is:

> ⚡ **Make reads as fast as possible**: searching, viewing products, and checking out.

### The plan (table of contents of the design)
1. Products database
2. Cart service
3. Placing orders
4. Optimizing reads

---

## 5. Step 4: The Products Database

`(4:10)`

### What do we know about product data?

| Fact | What it means for design |
|---|---|
| ~1 PB of data | Need **partitioning** (sharding) |
| Mostly **read**, rarely **written** (only sellers/admins edit descriptions) | Optimize for **reads**, not writes |
| Products are very different from each other (a TV vs. a T-shirt have different fields) | Need a **flexible schema** |
| We usually load the **whole product at once** | Store each product as **one document** |

### Design decisions

**1. Single-leader replication**
One main database (the *leader*) accepts writes; copies (*followers*) serve reads. Since writes are rare, we don't need a more complex setup.

**2. B-tree index (not LSM / SSTable)**
- **B-tree:** walk down a tree once and find your data → **fast reads**, slower writes.
- **SSTable (LSM tree):** may have to check several files to find data → **slower reads**, faster writes.
- We care about reads → **B-tree wins**.

**3. NoSQL for the flexible schema → MongoDB**
- Stores products as **JSON documents**, so each product can have different fields.
- Uses B-tree indexes + single-leader replication. ✅ matches everything above.
- **Data locality:** the whole product lives in one document, so one read gets everything. No joins needed.
- **Shard (partition) by product ID.**

```js
// Example product document in MongoDB
{
  "productId": 10,
  "name": "Wooden Broom",
  "price": 12.99,
  "department": "Home",
  "inStock": true,
  "images": ["https://cdn.example.com/broom1.jpg"],
  "specs": { "handleLength": "120cm", "material": "wood" } // flexible!
}
```

> 💡 He says this is "one of the very few cases" where he picks NoSQL **because of the data model** (flexible schema), not because of scale.

---

## 6. Step 5: Building the Cart (The Hardest Part)

`(6:30 – 15:00)`

### The problem
More than one person can edit the **same cart at the same time** (e.g., you on your phone and your laptop, or you and a family member on a shared account). We want:
- Nobody's changes get lost
- Writes stay fast
- When you click "Checkout", the items you just added are actually there

He builds up the solution step by step, from bad to good. 👇

---

### ❌ Attempt 1: Send the whole cart and overwrite it `(6:50)`

The frontend sends the entire cart array to the database, which replaces the old one.

```
Database cart:   [eggs, ham]
User A sends:    [eggs, ham, milk]
User B sends:    [carrots]        ← B didn't know about A's change
Final result:    [carrots]        😱 eggs, ham, milk are gone!
```

**Problem:** the **last write wins** and wipes out everyone else's changes. This is called a **lost update**.

---

### ❌ Attempt 2: Store the cart as a list and append `(7:20)`

Each user adds one item to the end of a list.

**Problem:** to keep the list in order, every append must **grab a lock** on the list. If many people add at the same time, they all wait in line. This is **lock contention** (slow).

---

### ⚠️ Attempt 3: Store the cart as a set (a table of rows) `(8:15)`

| cart_id | product_id |
|---|---|
| 1 | 10 |
| 1 | 22 |

- Order doesn't matter, so **adding** different items needs **no lock**. 👍
- **But** if one person **adds** an item and another **deletes** the same item at the same time, both must lock that row. Otherwise you get a **race condition** (unpredictable result). 👎

His joke: *"I'm desperately trying to add 20 boxes of tissues and my mom keeps deleting them."* Unlikely in real life, but we pretend it happens a lot.

---

### 🧠 Two general ways to avoid lock contention `(9:30)`

This "playbook" is used **again later** for orders, so remember it:

| Option | Idea | Trade-off |
|---|---|---|
| **A. Buffer & process one by one** | Put all writes in a queue (Kafka), process them in order | Asynchronous: there's a delay before the write is applied |
| **B. Spread writes to many places** | Multiple database leaders accept writes; they sync later | **Eventual consistency**: copies may disagree for a moment |

### ❌ Option A for the cart: Kafka `(10:00)`

If "add to cart" goes into a queue and is processed **later**, then:
1. You add an item
2. You immediately click **Checkout**
3. The queue hasn't processed your add yet → **the item is missing from your order!** 😱

The cart needs to feel **instant (synchronous)**. So Kafka is out for the cart.

### ✅ Option B for the cart: Multiple leaders + a CRDT `(10:40)`

- Each cart can be written on **several leader databases**.
- Each leader keeps **its own copy** of the cart.
- Leaders **sync up in the background** and eventually **agree** (converge).

**How do they agree without conflicts?** With a **CRDT (Conflict-free Replicated Data Type)**: a special data structure designed so that copies can always be merged automatically, in any order, and always end up the same.

**Important rule: read your own writes.** `(11:50)`
If you write to Leader 1, you should also **read from Leader 1**. That way, when you check out, you always see the items *you* just added, even if Leader 2 hasn't synced yet.

---

### 🔍 Deep dive: The Observe-Remove Set (OR-Set) `(12:00)`

This is the CRDT used for the cart. It solves a tricky problem: **how do you delete an item and then add it back again** across multiple databases?

#### The trick: give every "add" a unique tag

Every time someone adds a product, we attach a **random unique ID (UUID)** to it, called a **tag**.

- To **add**: store `(product, newRandomTag, deleted = no)`
- To **delete**: mark the specific tags **you have seen** as `deleted = yes`

It's also **operation-based**: we send only the single change ("add 12" / "remove 12"), not the whole cart.

#### Example 1: Delete, then someone re-adds

```
Time 1: User A adds product 12      → (12, tag a32, deleted: no)    [Leader 1]
Time 2: User B reads Leader 1, sees (12, a32)
Time 3: User B deletes it           → (12, tag a32, deleted: yes)   [Leader 2]
Time 4: User C adds product 12 again→ (12, tag 6d27, deleted: no)   [Leader 2]
        (a NEW add, so it gets a NEW tag)

Leaders merge:
  a32  → added AND deleted → cancels out ❌
  6d27 → added, never deleted → stays ✅

Final cart: product 12 is IN the cart ✅
```

**Why?** User B only deleted the copy they **observed** (`a32`). They never saw `6d27`, so they couldn't have meant to delete it. That's why it's called "**Observe**-Remove".

#### Example 2: Delete after seeing both adds

```
Time 3: Someone adds product 12 → (12, tag 6d27)
Time 4: User B reads and sees BOTH a32 and 6d27, deletes BOTH

Final cart: product 12 is NOT in the cart ❌
```

> 🎯 **The tag is the source of truth.** You can only delete what you've seen. This gives correct results no matter what order the leaders sync in.

#### Which database? → **Riak**
- Think of it like **Cassandra** (a leaderless/multi-leader, highly available DB) but with **built-in CRDT support**.
- **Partition by cart ID**, so all writes for one cart live on the same set of nodes and converge through background syncing (*anti-entropy*).

**Cart table schema:**

| cart_id | product_id | tag (UUID) | deleted |
|---|---|---|---|
| 1 | 12 | a32 | yes |
| 1 | 12 | 6d27 | no |

---

## 7. Step 6: Placing Orders & Managing Stock

`(15:00 – 22:30)`

### The problem: counters need locks

Each product has a **stock counter**, e.g. *product 10 → 100 left*. Buying 5 means `100 → 95`.

Updating a counter is a **read → change → write** operation. Without a lock:

```
Stock = 10
Process A reads 10        Process B reads 10
Process A writes 10 + 1   Process B writes 10 + 1
Result: 11  ❌ (should be 12): one update was LOST
```

So we need a lock. And locks mean **contention** when many people buy the same product (think: a flash sale 🔥).

Let's use the playbook from the cart section again.

---

### ❌ Option B: Multiple leaders + a counter CRDT `(17:00)`

Each leader tracks how much *it* has sold, and they sync later.

**Problem: overselling.** `(18:00)`

```
Real stock: 10 units

Leader 1 (thinks 10 left): receives an order for 10 → ✅ "Order confirmed!"
Leader 2 (thinks 10 left): receives an order for 10 → ✅ "Order confirmed!"

Leaders sync: "Oh no... we sold 20 but only had 10." 😱
```

Now you must email customers saying "sorry, your order isn't actually coming." **Terrible.** For stock, eventual consistency doesn't work. We need **one source of truth**.

---

### ✅ Option A: Buffer in Kafka, process one at a time with Flink `(18:50)`

For orders, a small delay is **fine**. You get a confirmation email a few seconds later, and that's normal. So we use the queue approach:

1. Orders go into **Kafka** (a durable, ordered queue).
2. **Flink** (a stream processor) reads them **one at a time** per product, so there are no locks and no races.
3. If stock is available → decrease it and **email the user** "your order is confirmed".

#### The order pipeline, step by step `(19:50)`

```
           ┌───────────────┐
 User ───▶ │ Order Service │
           └──────┬────────┘
                  │  whole order: {tissues ×2, lotion ×1}
                  ▼
     ┌────────────────────────────┐
     │ Kafka: "full orders" topic │   ← Step 1: ATOMIC. The whole order is saved
     └──────────┬─────────────────┘     at once, or not at all
                ▼
     ┌────────────────────────────┐
     │ Flink: "order splitter"    │   ← Step 2: split into one message per product
     └──────────┬─────────────────┘
                ▼
     ┌────────────────────────────┐
     │ Kafka: per-product topic   │   ← Step 3: sharded by PRODUCT ID
     │ (sharded by product ID)    │
     └──────────┬─────────────────┘
                ▼
     ┌────────────────────────────┐      ┌───────────────────────────┐
     │ Flink: "inventory check"   │ ◀─── │ Kafka: inventory changes  │ ◀── Sellers
     │ keeps current stock        │      │ ("product 10: +250 stock")│
     └───┬──────────────┬─────────┘      └───────────────────────────┘
         ▼              ▼
     📧 Email user   Mark "out of stock" in Products DB (when stock hits 0)
```

#### Why each step matters

**Step 1: one Kafka message for the whole order (atomicity)** `(20:10)`
If we sent "tissues" and "lotion" as two separate messages, one might arrive and the other might get lost, leaving **half an order**. One message = all or nothing. Once it's in Kafka, it **will** eventually be processed.

**Step 2: split the order**
The splitter routes each item (product + quantity) to the right per-product queue.

**Step 3: shard by product ID**
All orders for product 10 go to the **same** queue → the **same** Flink worker. One worker per product = **no lock needed**, since it handles orders one by one.

**Step 4: the inventory check**
Example: you want 3, and 3 are left → set stock to 0 → email "you're good to go!" → write "product is **out of stock**" to the products database.

**Restocking** `(22:00)`
Sellers send updates like *"product 10: +250 units"* into a separate Kafka topic. The Flink worker reads those too, so stock goes `0 → 250` and new orders can be filled.

#### ⚠️ A small catch: emails aren't idempotent `(19:20)`

**Idempotent** = doing something twice has the same effect as doing it once.

If Flink sends the email and then **crashes before recording** that it did, it will replay the message → **the customer gets two emails.** Not the end of the world. (You could prevent it with *two-phase commit*, but that's more complex.)

---

## 8. Step 7: Making Popular Items Load Fast

`(22:30 – 26:00)`

We can't put **everything** in fast memory (too expensive). So we cache only the **popular** items, since that's where most traffic goes.

### How do we know what's popular? `(23:10)`

Count something over a time window: number of **orders**, **clicks**, or **reviews**.

```
Flink (already sees every order)
   │  counts orders per product per day
   ▼
HDFS (big cheap storage), exported once a day
   │
   ▼
Spark batch job
   • calculates a popularity score per product
   • ranks products within each category (mattresses, video games, …)
   • can weight recent days more (exponential weighting)
   │
   ▼
Pre-load the top items into:
   • Redis cache   ← product data (from MongoDB)
   • CDN           ← product images (from S3)
```

He mentions **Spark Streaming** for counting (mini-batches are fine since this isn't urgent). In the final diagram, the counting happens in the **Flink inventory node**, which already sees every order.

### Why a CDN for images? `(25:40)`
Images are big. A CDN keeps copies on servers **all around the world**, so a user in India loads images from a nearby server instead of one in the US. Shorter distance = faster load.

---

## 9. Step 8: Making Search Fast

`(26:00 – 31:00)`

Amazon's giant search bar must return results **instantly**.

### The tool: a search index (Elasticsearch)

Under the hood it's an **inverted index**, a map from **word → products containing that word**:

```
"mattress" → [product 2, product 19, product 45, ...]
"tissues"  → [product 7, product 88, ...]
"kleenex"  → [product 7]
```

### Tip: store mini product info in the index (denormalization) `(26:50)`
Instead of storing just product IDs, store a **small summary** (name, price, thumbnail). Then the search results page can render **without a second database lookup**.

**Denormalization** = deliberately copying data into more than one place so reads are faster.

### How do we split (partition) the search index?

#### Option 1: Global (term-based) partitioning `(27:10)`
Each **word** lives on one node: "mattress" on Node A, "tissues" on Node B.
- 👍 A search hits only **one node**.
- 👎 A product like "Kleenex Tissues" must be stored on **both** the "kleenex" node and the "tissues" node → **a lot of duplicate data**, especially with full descriptions.
- 👎 We don't even need *all* results on one node, because the frontend uses **pagination** (page 1, page 2…).

#### Option 2: Local (document-based) partitioning ✅ `(28:30)`
Each node holds a **set of products** and builds its own small inverted index for them.
- No duplication.
- But which products go on which node? 👇

#### The smart part: partition by category, then by popularity `(29:30)`

1. **Group by category**: all mattresses on the same group of nodes.
2. **Within a category, split by popularity score range** (from the Spark job).

```
Mattress category, sorted by popularity:
  ┌─ Node 1 ─────────────────┐   ┌─ Node 2 ─────────────────┐
  │ prod 2  (score 3.6)      │   │ prod 33 (score 1.4)      │
  │ prod 19 (score 2.1)      │   │ prod 8  (score 1.1)      │
  │ ...                      │   │ ...                      │
  └──────────────────────────┘   └──────────────────────────┘
        = Page 1 of results            = Page 2 of results
```

Search results are shown **most popular first**, so **page 1 lives on one node, page 2 on the next.** Each page load hits just one node. ⚡

> 🧠 **Summary:** Partition products by **category**, then by **popularity score range**.

---

## 10. Step 9: Updating Caches Without Slowing Users Down

`(30:55 – 32:30)`

Every day, the Spark job produces new popularity rankings, so we need to reload the caches and re-partition search. But writing tons of data into the **live** cluster eats network bandwidth and **slows down real users**. ❌

### Solution: blue-green style switch with a standby cluster

```
1. ~30 min before the batch job: spin up a STANDBY cluster (e.g. EC2 machines)
2. Spark fills the standby cluster with new caches + search indexes
3. Tell ZooKeeper (the "address book" of services): "use the standby cluster's URLs now"
4. ZooKeeper notifies all app servers (via a "watch") → they switch over instantly
5. ~20 min later: shut down the old cluster (it becomes the next standby) to save money
```

**Bonus idea:** do this **per region** at night, when most people there are asleep and traffic is low.

---

## 11. Step 10: The Full Architecture (Putting It All Together)

`(32:30 – 36:50)`

Here's the full user journey, following the final whiteboard diagram:

```
                                ┌──────────────┐
                                │  ZooKeeper   │ (tells services where to point)
                                └──────────────┘
 ① SEARCH
 User ──▶ Search Service ──▶ Elasticsearch
                             (sharded by product type + popularity score range)

 ② VIEW PRODUCT
 User ──▶ Product Service ──▶ Redis Product Cache ──(cache miss)──▶ MongoDB Products DB
                                                                  (sharded by product ID)
                              Images ──▶ CDN

 ③ CART
 User ──▶ Cart Service ──▶ Riak Cart DB (OR-Set CRDT, partitioned by cart ID)

 ④ ORDER
 User ──▶ Order Service ──▶ Kafka (full orders)
                              ──▶ Flink (split orders)
                              ──▶ Kafka (sharded by product ID)
                              ──▶ Flink (inventory check, sharded by product ID) ──▶ 📧 Email
                                     ▲                         │
                Kafka (inventory changes) ◀── Sellers         │ daily order counts
                                                               ▼
                                                             HDFS ──▶ Spark batch job
                                                                        │
                                       updates caches, CDN, Elasticsearch (on standby cluster)
                                       then switches traffic via ZooKeeper
```

### The journey in plain English

1. **Search "mattress"** → Elasticsearch returns page 1 from a single node, with thumbnails already included.
2. **Click a product** → check the Redis cache (popular items are pre-loaded). On a miss, read from MongoDB. Images come from the CDN.
3. **Add to cart** → write to your Riak leader (and read from the same one). Conflicts are merged automatically by the OR-Set.
4. **Place order** → it goes into Kafka as one message, gets split per product, and the inventory worker checks stock one order at a time. You get a confirmation email.
5. **Every night** → order counts go to HDFS → Spark ranks popularity → a fresh standby cluster gets new caches and indexes → ZooKeeper switches traffic over.

### Tech choices summary

| Component | Technology | Why |
|---|---|---|
| Products DB | **MongoDB** | Flexible JSON schema, B-tree (fast reads), single leader |
| Product cache | **Redis** | In-memory = super fast for popular items |
| Images | **S3 + CDN** | Cheap storage + served close to users |
| Cart DB | **Riak** | Multi-leader with built-in CRDTs (OR-Set) |
| Order queue | **Kafka** | Durable, ordered, partitioned by product ID |
| Stream processing | **Flink** | Processes orders one by one per product, no locks |
| Popularity batch job | **HDFS + Spark** | Big daily data crunching |
| Search | **Elasticsearch** | Inverted index, local partitioning |
| Service discovery | **ZooKeeper** | Switch traffic to the new cluster instantly |

---

## 12. Glossary: Every Term Explained Simply

| Term | Simple meaning |
|---|---|
| **Partitioning / Sharding** | Splitting a huge dataset across many machines (e.g., products 1–1M on machine A, 1M–2M on B). |
| **Replication** | Keeping copies of the same data on multiple machines (for safety and faster reads). |
| **Single-leader replication** | One machine accepts writes; the others copy from it. Simple, no write conflicts. |
| **Multi-leader replication** | Several machines accept writes and sync later. Faster writes, but possible conflicts. |
| **B-tree** | An index structure that's fast to read from. Used by most traditional databases. |
| **SSTable / LSM tree** | An index structure that's fast to write to, but reads may check several files. |
| **Schema** | The "shape" of your data (which fields exist). NoSQL = flexible shape. |
| **Lock** | "Wait, I'm using this right now." Prevents two processes from changing the same data at once. |
| **Lock contention** | Many processes waiting for the same lock → slow. |
| **Race condition** | The result depends on who runs first → unpredictable bugs. |
| **Lost update** | Two writes overlap and one silently overwrites the other. |
| **Eventual consistency** | Copies may differ briefly but will agree "eventually". |
| **CRDT** | A data type whose copies can always be merged automatically without conflicts. |
| **OR-Set (Observe-Remove Set)** | A CRDT set where each add has a unique tag; you can only delete tags you've seen. |
| **Read-your-own-writes** | You always see your own changes immediately (by reading from where you wrote). |
| **Kafka** | A durable message queue / log. Messages are kept in order and processed later. |
| **Flink** | A stream processor that reads messages from Kafka one by one and does work. |
| **Atomicity** | All or nothing: the whole thing happens, or none of it does. |
| **Idempotent** | Doing it twice has the same effect as doing it once. |
| **Two-phase commit** | A protocol to make several systems commit together (complex and slow). |
| **Cache (Redis)** | A fast in-memory store for frequently used data. |
| **Cache miss** | The data isn't in the cache, so you fall back to the database. |
| **CDN** | Servers worldwide that store copies of files (images) close to users. |
| **HDFS** | A distributed file system for storing huge amounts of data cheaply. |
| **Spark** | A tool for crunching big data in batches (e.g., once per day). |
| **Inverted index** | A map from words → the documents/products that contain them. Powers search. |
| **Denormalization** | Copying data into extra places so reads don't need extra lookups. |
| **Pagination** | Showing results in pages (page 1, page 2…) instead of all at once. |
| **ZooKeeper** | A coordination service, like an address book telling apps where other services live. |
| **Conversion rate** | % of visitors who actually buy something. |

---

## 13. Interview Cheat Sheet

If you're asked **"Design Amazon / Flipkart"**, here's the flow to follow:

1. **Clarify scope** → search, product page, cart, orders. Skip payments/reviews.
2. **Estimate** → ~1B products × 1 MB = 1 PB → must partition. ~100 orders/sec.
3. **State the goal** → reads must be fast (latency = lost sales).
4. **Products DB** → read-heavy + flexible schema → MongoDB, B-tree, single leader, shard by product ID.
5. **Cart** → concurrent edits → avoid overwrite/list/locks → multi-leader + **OR-Set CRDT** (Riak), read-your-writes. Explain why Kafka doesn't fit (must be synchronous).
6. **Orders** → stock counter needs locks → a CRDT would **oversell** → use **Kafka + Flink**, one message per full order (atomic), split, shard by product ID, process one at a time.
7. **Fast reads** → daily popularity via Flink/Spark → pre-load Redis + CDN.
8. **Search** → Elasticsearch, local index, partition by **category + popularity range** so each results page hits one node.
9. **Refresh safely** → build a standby cluster, switch with ZooKeeper.

### 🔑 The one lesson to remember
There are **two ways to avoid lock contention**:

| | Cart | Orders |
|---|---|---|
| **Spread writes (multi-leader + CRDT)** | ✅ Used. Must be instant; small temporary differences are OK | ❌ Would oversell stock |
| **Queue + process in order (Kafka + Flink)** | ❌ Too slow; item might be missing at checkout | ✅ Used. A short delay is fine; correctness matters most |

**Picking the right tool depends on which matters more: speed or strict correctness.** That's the core of system design.

---

## 14. What This Means for a Frontend / React Developer

Even though this video is about the backend, a few ideas apply directly to frontend work:

### 1. Don't send the whole state; send the change
The "bad cart" at `(6:50)` is a very common frontend mistake:

```jsx
// ❌ Bad: overwrites the whole cart; can erase changes made in another tab
await fetch('/api/cart', {
  method: 'PUT',
  body: JSON.stringify({ items: cartItems }),
});

// ✅ Better: send only the operation
await fetch('/api/cart/items', {
  method: 'POST',
  body: JSON.stringify({ productId: 12 }),
});

await fetch('/api/cart/items/12', { method: 'DELETE' });
```

### 2. The same bug exists in React state
The "two processes read 10 and both write 11" lost update also happens with React state:

```jsx
// ❌ Both calls read the same stale `count` → only +1 instead of +2
setCount(count + 1);
setCount(count + 1);

// ✅ Use the updater function → each update uses the latest value
setCount(c => c + 1);
setCount(c => c + 1);
```

### 3. Optimistic UI = "read your own writes"
When a user clicks "Add to cart", update the UI **immediately** and send the request in the background. The user sees their change instantly, which is exactly why the backend reads from the same leader it wrote to.

### 4. Performance = money
"100 ms of delay hurts sales" is why frontend devs care about lazy loading, image optimization, CDNs, code splitting, and caching. The backend team optimizes with Redis and CDNs; you optimize the bundle and rendering.

---

*Based on the video by Jordan has no life. These notes are a simplified learning summary.*
