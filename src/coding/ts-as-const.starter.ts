// 1. Make ROLES a readonly tuple of its exact strings
const ROLES = ['admin', 'editor', 'viewer']

// 2. Derive the Role union FROM the array (don't type the strings again)
type Role = string

const LABELS = {
  admin: 'Administrator',
  editor: 'Editor',
  viewer: 'Viewer',
}

// 3. getLabel should only accept a Role
function getLabel(role: string): string {
  return LABELS[role]
}

console.log(ROLES.map(getLabel))
