## Problem

Write `isAnagram(a, b)` that returns `true` if `b` uses **exactly the same letters** as `a`, the **same number of times**, just in a different order.

## Examples

```js
isAnagram('listen', 'silent')   // true
isAnagram('anagram', 'nagaram') // true
isAnagram('rat', 'car')         // false
isAnagram('aab', 'abb')         // false  (same letters, different counts)
isAnagram('a', 'ab')            // false  (different lengths)
```

## Hints

1. **Different lengths?** Then it can't be an anagram.
2. **Sort both strings**, or **count each letter**.

<!-- SOLUTION -->

## Sort and compare

```js
function isAnagram(a, b) {
  if (a.length !== b.length) return false
  const sort = (s) => s.split('').sort().join('')
  return sort(a) === sort(b)
}
```

```
'listen' → sorted 'eilnst'
'silent' → sorted 'eilnst'   → equal → true ✅
```

- **Time: O(n log n)** because of sorting.
- **Short and easy to explain**, a good first answer.

## Count characters

**O(n):** count letters in `a`, then "use them up" with `b`.

```js
function isAnagram(a, b) {
  if (a.length !== b.length) return false

  const count = {}
  for (const ch of a) count[ch] = (count[ch] || 0) + 1   // listen → { l:1, i:1, s:1, t:1, e:1, n:1 }

  for (const ch of b) {
    if (!count[ch]) return false     // letter missing, or used too many times
    count[ch]--
  }
  return true
}
```

```
a = 'aab' → count { a: 2, b: 1 }
b = 'abb' → a: 2→1, b: 1→0, b: 0 → !count['b'] → false ✅
```

- **Time: O(n). Space: O(k)** for the k distinct characters.
- **The expected "optimal" answer.**

## Edge cases

| Input | Expected | Why |
|---|---|---|
| `'', ''` | `true` | both empty |
| `'a', 'ab'` | `false` | length check first |
| `'aab', 'abb'` | `false` | same letters, different counts |
| `'Listen', 'Silent'` | `false` here | case-sensitive; lowercase both first if the interviewer wants to ignore case |

**Follow-up:** "Group anagrams together", e.g. `['eat','tea','tan','ate','nat','bat']` → use the **sorted word as a key** in a Map: `{ aet: ['eat','tea','ate'], ant: ['tan','nat'], abt: ['bat'] }`.

## 🎯 Interview answer

> "First I check the lengths, since anagrams must be the same length. The simplest solution sorts both strings and compares them, which is O(n log n). The optimal solution counts characters: I build a frequency map from the first string, then go through the second string decrementing counts, returning false if a character is missing or its count hits zero. That's O(n) time and O(k) space for the distinct characters. If case or spaces shouldn't matter, I normalise both strings first."
