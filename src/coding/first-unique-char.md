## Problem

Write `firstUniqueChar(str)` that returns the **first character that appears only once** in the string. If there isn't one, return `null`.

## Examples

```js
firstUniqueChar('leetcode')       // 'l'
firstUniqueChar('loveleetcode')   // 'v'
firstUniqueChar('swiss')          // 'w'
firstUniqueChar('aabb')           // null
firstUniqueChar('')               // null
```

## Hints

1. **You need to know how many times each character appears**, so count first.
2. **Then go through the string again, in order**, and return the first character with count 1.

<!-- SOLUTION -->

## Count then scan

**Two passes:** first count, then find.

```js
function firstUniqueChar(str) {
  const count = new Map()
  for (const ch of str) count.set(ch, (count.get(ch) || 0) + 1)

  for (const ch of str) {
    if (count.get(ch) === 1) return ch
  }
  return null
}
```

```
'swiss'
Pass 1 → counts: s:3, w:1, i:1
Pass 2 → 's'(3) no, 'w'(1) yes → return 'w' ✅
```

- **Time: O(n)** (two passes). **Space: O(k)** for the distinct characters.
- **Why scan the string, not the map?** We need the **first** unique character **in the string's order**. (A `Map` also keeps insertion order, so scanning the map works too, but the string is clearer.)

## indexOf trick

**Short, but O(n²):** a character is unique if its first and last positions are the same.

```js
function firstUniqueChar(str) {
  for (const ch of str) {
    if (str.indexOf(ch) === str.lastIndexOf(ch)) return ch
  }
  return null
}
```

- **Readable**, but `indexOf` and `lastIndexOf` scan the string for every character.
- **Mention it, then give the counting solution** as the efficient one.

## Edge cases

| Input | Expected |
|---|---|
| `''` | `null` |
| `'a'` | `'a'` |
| `'aabb'` | `null` |
| `'aA'` | `'a'` (case-sensitive: `a` and `A` are different) |

**Variants interviewers ask:** return the **index** instead (LeetCode 387, return `-1` if none), or find the **first repeating** character.

## 🎯 Interview answer

> "I solve it in two passes. First I count each character's frequency in a Map. Then I go through the string again in order and return the first character whose count is 1, or null if none. That's O(n) time and O(k) space. A one-liner using `indexOf(ch) === lastIndexOf(ch)` also works, but it's O(n²), so I'd mention it and use the counting approach."
