## Short answer

- **A stream processes data piece by piece (in chunks)**, instead of loading everything into memory first.
- **Backpressure** is what happens when the **producer is faster than the consumer**. Data piles up in memory unless the producer **pauses** until the consumer catches up.
- **`pipe()` and `pipeline()` handle backpressure for you.** When writing manually, check **`write()`'s return value** and wait for the **`'drain'`** event.

**Analogy: filling a bucket from a tap** 🚰

- **Stream** = water flowing through a pipe, instead of carrying the whole lake at once.
- **Backpressure** = the bucket (consumer) is filling up, so you **turn down the tap** (pause the producer) until it empties a bit.

---

## Why streams

```js
// ❌ Loads the WHOLE 2 GB file into memory, then sends it
app.get('/video', async (req, res) => {
  const data = await fs.promises.readFile('movie.mp4')
  res.end(data)
})

// ✅ Sends it in small chunks: memory stays low, the first bytes arrive immediately
app.get('/video', (req, res) => {
  fs.createReadStream('movie.mp4').pipe(res)
})
```

| | `readFile` (buffer everything) | Stream |
|---|---|---|
| Memory for a 2 GB file | ~2 GB 😱 | ~64 KB at a time |
| Time to first byte | after the whole file is read | immediately |
| Many users at once | memory explodes | fine |

---

## 4 stream types

| Type | Can | Examples |
|---|---|---|
| **Readable** | produce data | `fs.createReadStream`, HTTP **request** (`req`), `process.stdin` |
| **Writable** | consume data | `fs.createWriteStream`, HTTP **response** (`res`), `process.stdout` |
| **Duplex** | both, independently | TCP socket (`net.Socket`) |
| **Transform** | both, output computed from input | `zlib.createGzip()`, `crypto.createCipheriv()` |

**Streams are EventEmitters.** Key events: `data`, `end`, `error`, `finish`, `drain`, `close`.

**Data is often a `Buffer`:** Node's type for raw binary data (bytes). Pass an encoding (`'utf8'`) to get strings instead.

---

## Backpressure explained

**Every writable stream has an internal buffer** with a limit called **`highWaterMark`** (16 KB by default for byte streams; 16 objects in object mode). `fs.createReadStream` reads in bigger 64 KB chunks.

```
Readable (fast disk)  ──chunks──▶  [ Writable's buffer ]  ──▶  slow network client
                                     ▲ fills up!
```

- **`writable.write(chunk)` returns `true`** while the buffer is below the limit: keep writing.
- **It returns `false`** when the buffer is full: **stop writing**.
- **The `'drain'` event fires** when the buffer has emptied: **resume**.

**Ignoring `false` doesn't lose data**, but it keeps buffering **in memory**, so a fast producer and a slow consumer can use **huge amounts of RAM** and crash the process.

### Handling it manually

```js
const fs = require('fs')
const out = fs.createWriteStream('numbers.txt')

let i = 0
function writeMore() {
  while (i < 1_000_000) {
    const ok = out.write(`${i++}\n`)
    if (!ok) {
      out.once('drain', writeMore)   // ⏸ buffer full → wait, then continue
      return
    }
  }
  out.end()                          // no more data
}
writeMore()
```

---

## pipe vs pipeline

**`pipe()` handles backpressure automatically:** it pauses the readable when `write()` returns `false`, and resumes it on `drain`.

```js
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('input.txt.gz'))
```

⚠️ **But `pipe()` doesn't forward errors.** If one stream fails, the others aren't closed, which leaks file handles.

**✅ Use `pipeline()`:** backpressure **plus** error handling and cleanup of every stream:

```js
const { pipeline } = require('stream/promises')
const zlib = require('zlib')
const fs = require('fs')

async function compress() {
  try {
    await pipeline(
      fs.createReadStream('input.txt'),
      zlib.createGzip(),
      fs.createWriteStream('input.txt.gz')
    )
    console.log('done')
  } catch (err) {
    console.error('failed:', err)     // any stream's error lands here, all streams cleaned up
  }
}
```

---

## Custom transform

**Uppercase a file while streaming it:**

```js
const { Transform } = require('stream')

const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase())   // push the transformed chunk
  },
})

await pipeline(fs.createReadStream('in.txt'), upperCase, fs.createWriteStream('out.txt'))
```

**Reading a stream with `for await`** (async iteration, which also respects backpressure):

```js
for await (const chunk of fs.createReadStream('big.log', { encoding: 'utf8' })) {
  // process chunk
}

// line by line
const readline = require('readline')
const rl = readline.createInterface({ input: fs.createReadStream('big.log') })
for await (const line of rl) {
  if (line.includes('ERROR')) console.log(line)
}
```

---

## Real-world uses

- **File uploads and downloads** without loading files into memory.
- **Video and audio streaming.**
- **Processing huge CSV or log files** line by line.
- **Compressing responses** on the fly (gzip).
- **Proxying:** `upstreamResponse.pipe(res)`.
- **Database exports:** query cursor → transform → CSV → response.

---

## Quick Q&A

**Q: What is a stream?**
An abstraction for handling data in chunks over time, instead of all at once. Types: Readable, Writable, Duplex, Transform.

**Q: What is backpressure?**
When a producer writes faster than a consumer can handle, data builds up in memory. The fix is to pause the producer until the consumer drains.

**Q: How does Node signal backpressure?**
`writable.write()` returns `false` when the internal buffer reaches `highWaterMark`; the `'drain'` event fires when it's safe to write again.

**Q: `pipe()` vs `pipeline()`?**
Both handle backpressure. `pipeline()` also propagates errors and destroys all streams on failure, and has a promise version. Prefer `pipeline()`.

**Q: What is `highWaterMark`?**
The buffer size threshold (in bytes, or objects in object mode) at which a stream signals backpressure.

**Q: What is a Buffer?**
A fixed-size chunk of raw binary memory outside V8's heap, used for files, network data and streams.

---

## 🎯 Interview answer

> "Streams let Node process data in chunks instead of loading it all into memory, so a 2 GB file can be served with a few kilobytes of memory and the first bytes go out immediately. There are four types: Readable, Writable, Duplex and Transform, and they're EventEmitters. Backpressure happens when the producer is faster than the consumer, for example reading from disk faster than a slow client can download. Each writable has an internal buffer limited by `highWaterMark`; `write()` returns false when it's full, and the producer should stop until the `'drain'` event. If you ignore that, data keeps buffering in memory and the process can run out of memory. `pipe()` handles backpressure automatically, but doesn't propagate errors or clean up, so I use `stream.pipeline`, ideally the promise version, which handles backpressure, errors and cleanup for every stream in the chain."
