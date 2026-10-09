## Problem

Write `isValid(str)` that returns `true` if every bracket in the string is **closed by the same type of bracket**, in the **correct order**. The string contains only `()[]{}`.

## Examples

```js
isValid('()')        // true
isValid('()[]{}')    // true
isValid('{[]}')      // true   (nested correctly)
isValid('(]')        // false  (wrong type)
isValid('([)]')      // false  (wrong order)
isValid('(')         // false  (never closed)
isValid('')          // true
```

## Hints

1. **The most recently opened bracket must be closed first.** Which data structure is "last in, first out"?
2. **When you see a closing bracket**, what should be on top of it?

<!-- SOLUTION -->

## Stack solution

**A stack (an array with `push` and `pop`) remembers the open brackets.** A closing bracket must match the **last** opened one.

```js
function isValid(str) {
  const pairs = { ')': '(', ']': '[', '}': '{' }
  const stack = []

  for (const ch of str) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch)                          // opening → remember it
    } else {
      if (stack.pop() !== pairs[ch]) return false   // closing → must match the last opener
    }
  }

  return stack.length === 0                   // anything left open → invalid
}
```

**Step by step for `'{[]}'`:**

```
'{' → push        stack: [ '{' ]
'[' → push        stack: [ '{', '[' ]
']' → pop '['  ✅ matches   stack: [ '{' ]
'}' → pop '{'  ✅ matches   stack: [ ]
end → stack empty → true ✅
```

**And `'([)]'`:**

```
'(' → push        stack: [ '(' ]
'[' → push        stack: [ '(', '[' ]
')' → pop '['  ❌ expected '(' → false
```

- **Time: O(n). Space: O(n)** for the stack.
- **Quick win:** if the length is odd, it can't be valid: `if (str.length % 2) return false`.

## Edge cases

| Input | Expected | Why |
|---|---|---|
| `''` | `true` | nothing to match |
| `'('` | `false` | stack not empty at the end |
| `')'` | `false` | pop from an empty stack gives `undefined`, which isn't `'('` |
| `'(]'` | `false` | wrong type |
| `'([)]'` | `false` | wrong order |
| `'{[()()]}'` | `true` | deep nesting |

**Real-world use:** code editors highlighting matching brackets, checking HTML tags, and parsing maths expressions all use this stack idea.

## 🎯 Interview answer

> "I use a stack, because the most recently opened bracket must be closed first, which is last-in, first-out. I keep a map from each closing bracket to its opening one. When I see an opening bracket I push it; when I see a closing bracket I pop and check it matches, returning false otherwise, which also handles closing with an empty stack. At the end the stack must be empty, otherwise something was never closed. That's O(n) time and O(n) space, and an odd length can be rejected immediately."
