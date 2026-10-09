## Problem

Given an array of numbers `nums` and a number `target`, write `twoSum(nums, target)` that returns the **indices of the two numbers that add up to `target`**, as `[smallerIndex, largerIndex]`.

- **Exactly one answer** exists.
- **You can't use the same element twice.**

## Examples

```js
twoSum([2, 7, 11, 15], 9)   // [0, 1]  because 2 + 7 = 9
twoSum([3, 2, 4], 6)        // [1, 2]  because 2 + 4 = 6
twoSum([3, 3], 6)           // [0, 1]
```

## Hints

1. **Brute force:** try every pair. How slow is that?
2. **For each number, you need its "complement":** `target - number`. How can you check "have I already seen the complement?" in O(1)?

<!-- SOLUTION -->

## Brute force

**Try every pair:**

```js
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j]
    }
  }
}
```

- **Time: O(n²). Space: O(1).**
- **Fine to start with**, but the interviewer will ask you to make it faster.

## Hash map (optimal)

**One pass:** for each number, check whether its **complement** was seen earlier.

```js
function twoSum(nums, target) {
  const seen = new Map()                // number → its index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i]
    if (seen.has(complement)) {
      return [seen.get(complement), i]  // earlier index first
    }
    seen.set(nums[i], i)
  }
}
```

**Step by step for `[2, 7, 11, 15]`, target `9`:**

```
i=0: num=2, complement=7, seen {}        → not found → seen {2:0}
i=1: num=7, complement=2, seen {2:0}     → found! → return [0, 1] ✅
```

- **Time: O(n). Space: O(n).**
- **Why check before adding?** So a number can't pair with **itself**: for `[3, 3]`, target `6`, the second `3` finds the first one, giving `[0, 1]`.

## Comparison

| Approach | Time | Space |
|---|---|---|
| Brute force (two loops) | O(n²) | O(1) |
| **Hash map (one pass)** | **O(n)** | O(n) |
| Sort + two pointers | O(n log n) | O(n) (to keep original indices) |

**Follow-ups:**

- **The array is sorted?** Use **two pointers** from both ends: sum too small means move left up, too big means move right down. O(n) time, O(1) space.
- **Return the numbers, not the indices?** Use a `Set` of seen numbers.

## 🎯 Interview answer

> "The brute force checks every pair with two loops, which is O(n²). To optimise, I notice that for each number I need its complement, `target - num`. I loop once, keeping a Map from each number I've seen to its index. For each element, if the complement is already in the Map, I return its index and the current index; otherwise I store the current number. Checking before inserting means an element can't pair with itself. That's O(n) time and O(n) space. If the array were sorted, I'd use two pointers for O(1) space."
