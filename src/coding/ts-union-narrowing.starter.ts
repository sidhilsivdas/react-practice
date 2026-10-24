type Input = string | number | string[] | null

// 1. Return a display string for each kind of input:
//    number   → 2 decimals:      3.14159 → "3.14"
//    string   → trimmed:         "  hi  " → "hi"
//    string[] → joined by ", ":  ["a", "b"] → "a, b"
//    null     → "—"
function toDisplay(value: Input): string {
  // your code here
  return ''
}

// 2. Use the `in` operator to call the right method
type Cat = { meow: () => string }
type Dog = { bark: () => string }

function speak(pet: Cat | Dog): string {
  // your code here
  return ''
}

console.log(toDisplay(3.14159), toDisplay(['a', 'b']))
console.log(speak({ bark: () => 'Woof' }))
