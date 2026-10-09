## Problem

Write `isPalindrome(str)` that returns `true` if the string reads the **same forwards and backwards**, ignoring **case**, **spaces** and **punctuation** (only letters and digits count).

## Examples

```js
isPalindrome('racecar')                          // true
isPalindrome('Madam')                            // true  (case ignored)
isPalindrome('A man, a plan, a canal: Panama')   // true  (spaces + punctuation ignored)
isPalindrome('race a car')                       // false
isPalindrome('')                                 // true  (empty reads the same both ways)
```

## Hints

1. **Clean the string first:** lowercase it and keep only `a-z` and `0-9`.
2. **Then either** reverse it and compare, **or** walk inwards from both ends.

<!-- SOLUTION -->

## Reverse and compare

```js
function isPalindrome(str) {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  return clean === clean.split('').reverse().join('')
}
```

**Step by step for `'Madam'`:**

```
toLowerCase()            → 'madam'
replace(/[^a-z0-9]/g,'') → 'madam'   (removes anything that isn't a letter or digit)
split('')                → ['m','a','d','a','m']
reverse()                → ['m','a','d','a','m']
join('')                 → 'madam'
'madam' === 'madam'      → true ✅
```

- **Time: O(n). Space: O(n)** for the cleaned and reversed copies.
- **The most common answer**, and easy to explain.

## Two pointers

**No reversed copy needed:** compare the first and last characters, then move inwards.

```js
function isPalindrome(str) {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  let left = 0
  let right = clean.length - 1

  while (left < right) {
    if (clean[left] !== clean[right]) return false   // mismatch → not a palindrome
    left++
    right--
  }
  return true
}
```

```
'racecar'
 r ✓ r   → move in
  a ✓ a  → move in
   c ✓ c → move in
    e    → pointers meet → true
```

- **Time: O(n).** It can stop **early** at the first mismatch.
- **Interviewers often ask for this** as the follow-up: "can you do it without reversing?"

## Edge cases

| Input | Expected | Why |
|---|---|---|
| `''` | `true` | nothing to compare |
| `'a'` | `true` | one character |
| `'Madam'` | `true` | lowercase first |
| `'12321'` | `true` | digits count |
| `'.,!'` | `true` | becomes empty after cleaning |
| `'ab'` | `false` | |

## 🎯 Interview answer

> "I first normalise the string: lowercase it and remove everything that isn't a letter or digit with `/[^a-z0-9]/g`. The simple solution compares it to its reverse using `split('').reverse().join('')`, which is O(n). A better follow-up is two pointers: start at both ends, compare characters, and move inwards, returning false at the first mismatch. That's still O(n) time but stops early and doesn't need a reversed copy."
