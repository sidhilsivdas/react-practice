type User = { id: number; name: string }

// 1. true when value isn't null or undefined.
//    Change the return type so .filter(isDefined) removes null/undefined from the TYPE too.
function isDefined<T>(value: T | null | undefined): boolean {
  return value !== null && value !== undefined
}

// 2. Check that an unknown value (e.g. from an API) really is a User:
//    an object (not null, not an array) with a number `id` and a string `name`
function isUser(value: unknown): boolean {
  // your code here
  return false
}

const ids = [1, null, 2, undefined].filter(isDefined)   // should be number[]

const data: unknown = JSON.parse('{"id": 1, "name": "Ana"}')
if (isUser(data)) {
  console.log(data.name)   // should work once isUser is a type guard
}
