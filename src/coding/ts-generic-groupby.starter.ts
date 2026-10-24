// Group items by the key that getKey returns.
//   groupBy(['one', 'two', 'three'], (s) => s.length)
//   → { 3: ['one', 'two'], 5: ['three'] }
//
// Make it generic: the callback gets the item type, and the result's keys
// and values come from the callback's return type and the item type.
function groupBy(items: any[], getKey: (item: any) => any): any {
  // your code here (with a loop or reduce; Object.groupBy isn't available here)
  return {}
}

console.log(groupBy(['one', 'two', 'three'], (s) => s.length))
