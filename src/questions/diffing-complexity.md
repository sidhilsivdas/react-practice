## Short answer

Finding the **truly minimal** set of changes between two trees is a hard problem called **tree edit distance**. The best general algorithms take **O(n³)**. React refuses to solve that hard problem and uses shortcuts to get **O(n)**.

---

## The problem

Turn an old tree into a new tree using the **cheapest** set of edits:

| Operation | Example |
|---|---|
| Insert a node | add a `<li>` |
| Delete a node | remove a `<span>` |
| Relabel a node | `<div>` → `<section>` |

---

## Strings are O(n²)

To diff `"cat"` and `"cut"`, you fill a table (edit distance):

```
        ""  c  u  t
   ""    0  1  2  3
   c     1  0  1  2
   a     2  1  1  2
   t     3  2  2  1   ← 1 edit (a → u)
```

**n × m cells with constant work each gives O(n²).** A string is one-dimensional, so every character has exactly one "next".

---

## Why trees are harder

- **Nodes can move across levels.** A `<span>` deep inside could become a direct child of the root, so **any old node might match any new node**.
- **Deleting a node lifts its children up**, which reshapes the subtree.
- **Comparing two nodes means also aligning their lists of children**, where each child is a whole subtree.

---

## Where n³ comes from

```
  n × n   pairs of (old subtree, new subtree) to compare
×   n     work to align their children for each pair
─────────
  n³
```

Demaine et al. (2007) reached O(n³) and proved it's the best possible for this family of algorithms.

---

## Too slow for UI

| Elements (n) | n³ operations | Time at ~1B ops/sec |
|---|---|---|
| 100 | 1,000,000 | 1 ms |
| 1,000 | 1,000,000,000 | **~1 second** |
| 10,000 | 10¹² | **~17 minutes** |

You have **~16 ms per frame** for smooth 60 fps.

---

## React’s O(n) shortcuts

| Hard part | React's shortcut |
|---|---|
| Any node might match any node | **Only compare nodes at the same position** in the same parent |
| Moved nodes, lifted children | **A different type replaces the whole subtree** |
| Aligning child lists | **Match by `key`** (hash-map lookup) or by position |

**Each node is visited once, so the result is O(n).**

**The trade-off:** React's diff isn't always minimal. For example, wrapping something in a new `<div>` remounts it. But a slightly imperfect diff in 1 ms beats a perfect one in 1 second.

---

## 🎯 Interview answer

> "Diffing two trees minimally is the tree edit distance problem, which is O(n³): a minimal solution has to consider matching every old node with every new node, which is n² pairs, and for each pair it has to optimally align their children, another factor of n. For 1,000 elements that's a billion operations. React gets to O(n) by only comparing nodes at the same position, replacing a subtree when its type changes, and using keys to match list items. It trades a guaranteed minimal diff for speed."
