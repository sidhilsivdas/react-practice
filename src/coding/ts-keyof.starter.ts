// Make these generic so:
//   - the key must be a real key of the object
//   - the result has the type of that property

// 1. Read one property
function getProperty(obj: any, key: any): any {
  return obj[key]
}

// 2. Read one property from every item
function pluck(items: any[], key: any): any[] {
  return items.map((item) => item[key])
}

const user = { id: 1, name: 'Ana', admin: true }
const name = getProperty(user, 'name')     // should be string
const oops = getProperty(user, 'email')    // should be a type error
console.log(pluck([user], 'id'))           // should be number[]
