## Short answer

**Coercion means JavaScript automatically converts a value from one type to another**, like a string to a number, when an operation needs a different type.

**Analogy:** you hand a cashier a $10 note and a coin and ask "what's the total?" They **convert everything to the same currency** before adding. JavaScript does the same before `+`, `-` or `==`.

| Type | Who does it | Example |
|---|---|---|
| **Explicit** (type casting) | **You**, on purpose | `Number('5')`, `String(5)`, `Boolean(0)` |
| **Implicit** (coercion) | **JavaScript**, automatically | `'5' * 2` → `10` |

JavaScript only ever converts to **3 types: string, number or boolean.**

---

## String coercion (+)

**If either side of `+` is a string, `+` joins them as strings.**

```js
'5' + 2        // "52"
2 + '5'        // "25"
'5' + true     // "5true"
'5' + null     // "5null"
```

**`+` works left to right:**

```js
1 + 2 + '3'    // "33"   → (1 + 2) = 3, then 3 + '3' = "33"
1 + '2' + 3    // "123"  → '12', then '12' + 3 = "123"
```

---

## Number coercion

**`-`, `*`, `/`, `%` only work on numbers**, so they convert everything to a number:

```js
'5' - 2        // 3
'5' * '2'      // 10
'10' / '2'     // 5
true + true    // 2      (true → 1)
'abc' - 1      // NaN    (can't convert)
```

**Unary `+` is a quick way to convert to a number:**

| Value | `+value` |
|---|---|
| `''` | `0` |
| `' '` | `0` |
| `'42'` | `42` |
| `'12px'` | `NaN` |
| `true` / `false` | `1` / `0` |
| `null` | `0` |
| `undefined` | `NaN` |
| `[]` | `0` |
| `{}` | `NaN` |

**`Number()` vs `parseInt()`:**

```js
Number('12px')     // NaN  (whole string must be a number)
parseInt('12px')   // 12   (reads until it hits a non-digit)
```

---

## Truthy & falsy

In `if`, `&&`, `||`, `!` and ternaries, values become `true` or `false`.

**Only 8 values are falsy. Memorise these:**

```js
false   0   -0   0n   ''   null   undefined   NaN
```

**Everything else is truthy**, including these surprises:

```js
Boolean('0')       // true  ← non-empty string
Boolean('false')   // true  ← non-empty string
Boolean([])        // true  ← empty array
Boolean({})        // true  ← empty object
Boolean(' ')       // true  ← a space
```

---

## Objects & arrays

When an object or array has to become a primitive, JavaScript calls **`valueOf()`**, then **`toString()`**:

```js
[].toString()         // ""
[1, 2].toString()     // "1,2"
({}).toString()       // "[object Object]"
```

That explains these "weird" ones:

```js
[] + []      // ""                 → "" + ""
[] + {}      // "[object Object]"  → "" + "[object Object]"
[2] * [3]    // 6                  → "2" * "3" → 2 * 3
```

---

## == vs ===

| | `==` (loose) | `===` (strict) |
|---|---|---|
| Converts types first? | ✅ yes | ❌ no |
| `5 == '5'` | `true` | `false` |
| Recommended? | ❌ avoid | ✅ always |

**What `==` does, simplified:**

1. **Same type?** Compare normally.
2. **`null == undefined`** is `true`, and they **equal nothing else**.
3. **Boolean involved?** Convert it to a number (`true` → `1`, `false` → `0`).
4. **String and number?** Convert the string to a number.
5. **Object and primitive?** Convert the object to a primitive (`toString`).

```js
'' == 0              // true   ('' → 0)
'0' == false         // true   (false → 0, '0' → 0)
[1] == 1             // true   ([1] → '1' → 1)
[1, 2] == '1,2'      // true   ([1,2] → '1,2')
null == undefined    // true   (special rule)
null == 0            // false  (null only equals undefined!)
NaN == NaN           // false  (NaN equals nothing, not even itself)
```

---

## Trick questions

### `[] == ![]` is `true`?!

```js
[] == ![]
// Step 1: ![] → [] is truthy → !true → false
// Step 2: [] == false
// Step 3: false → 0               →  [] == 0
// Step 4: [] → '' → 0             →  0 == 0
// → true 😵
```

### `null >= 0` but `null != 0`

```js
null == 0    // false  (== has the special null rule)
null >= 0    // true   (>= converts null → 0, so 0 >= 0)
```

### Comparing strings

```js
10 < '9'      // false  (number vs string → '9' becomes 9)
'10' < '9'    // true   (string vs string → compared letter by letter: '1' < '9')
```

### baNaNa 🍌

```js
'b' + 'a' + +'a' + 'a'
// +'a' → NaN
// 'b' + 'a' + NaN + 'a' → "baNaNa"
```

---

## In React

### The `0` rendering bug

```jsx
const count = 0

{count && <p>You have messages</p>}
// ❌ Renders "0" on the page!
```

- **`&&` returns the first falsy value**, which is `0` here.
- **React doesn't render `false`, `null` or `undefined`**, but it **does render the number `0`**.

```jsx
{count > 0 && <p>You have messages</p>}          // ✅
{!!count && <p>You have messages</p>}            // ✅
{count ? <p>You have messages</p> : null}        // ✅
```

### Input values are always strings

```jsx
<input type="number" onChange={(e) => setAge(e.target.value)} />

age + 1   // "251" ❌ if age is "25"
```

✅ **Convert it:** `setAge(Number(e.target.value))`.

### `||` vs `??` for defaults

```js
const qty = 0
qty || 10    // 10 ❌ (0 is falsy, so it's treated as "missing")
qty ?? 10    // 0  ✅ (?? only replaces null/undefined)
```

---

## Best practices

- ✅ **Always use `===` and `!==`.**
- ✅ **Convert explicitly:** `Number(x)`, `String(x)`, `Boolean(x)`.
- ✅ **Use `??` instead of `||`** when `0` or `''` are valid values.
- ✅ **Use `Number.isNaN(x)`, not `x == NaN`**, which is always false.
- ✅ **`x == null` is the one accepted use of `==`**: it checks for `null` or `undefined` in one go.

---

## 🎯 Interview answer

> "Type coercion is JavaScript automatically converting a value from one type to another, and it only ever converts to string, number or boolean. It can be explicit, like `Number('5')`, or implicit, done by operators. With `+`, if either side is a string it concatenates, so `'5' + 2` is `'52'`, while other math operators convert to numbers, so `'5' - 2` is `3`. In boolean contexts, there are only eight falsy values, and everything else, including `'0'`, `[]` and `{}`, is truthy. Loose equality `==` coerces types before comparing, which gives surprising results like `'' == 0` or `[] == ![]` being true, so I always use strict equality `===`, which compares type and value. In React, coercion causes the classic bug where `{count && <Component />}` renders `0`, so I use `count > 0 &&` or a ternary instead, and I use `??` rather than `||` when zero is a valid value."
