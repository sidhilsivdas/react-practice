// 1. A Result is either a success with a value, or a failure with an error message
type Result<T> = any

// 2. Never throws. Success → the parsed value (as unknown, since it could be anything).
//    Invalid JSON → ok: false, with the error's message.
function parseJson(text: string): any {
  return JSON.parse(text)
}

// 3. Parse JSON text and return its `age` field.
//    Fails with the error 'age must be a number' unless the data is an object
//    (not null, not an array) with a number `age`. Bad JSON fails with parseJson's error.
function getAge(json: string): Result<number> {
  // your code here
  return { ok: false, error: 'not done' }
}

const r = getAge('{"age": 30}')
if (r.ok) console.log('Age:', r.value)
else console.log('Error:', r.error)
