// Shows any JS value the way a console would: [1, 'a', NaN], { id: 1 }, undefined...
// Used by the code runner (worker) and the test results.
export function formatValue(value, nested = false) {
  if (typeof value === 'string') return nested ? JSON.stringify(value) : value
  if (value === undefined) return 'undefined'
  if (typeof value === 'number' && Object.is(value, -0)) return '-0'
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`
  if (typeof value === 'bigint') return `${value}n`
  if (Array.isArray(value)) return `[${value.map((v) => formatValue(v, true)).join(', ')}]`
  if (value instanceof Set) return `Set(${value.size}) {${[...value].map((v) => formatValue(v, true)).join(', ')}}`
  if (value instanceof Map) {
    const entries = [...value].map(([k, v]) => `${formatValue(k, true)} => ${formatValue(v, true)}`)
    return `Map(${value.size}) {${entries.join(', ')}}`
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(([k, v]) => `${k}: ${formatValue(v, true)}`)
    return entries.length ? `{ ${entries.join(', ')} }` : '{}'
  }
  return String(value) // numbers (incl. NaN), booleans, null, symbols
}

// Deep equality for test results: NaN equals NaN, arrays and plain objects compared by content
export function isEqual(a, b) {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isEqual(item, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    return keysA.length === keysB.length && keysA.every((key) => isEqual(a[key], b[key]))
  }
  return false
}
