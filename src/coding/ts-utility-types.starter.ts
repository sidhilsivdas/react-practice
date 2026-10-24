interface User {
  id: number
  name: string
  email: string
  password: string
  role: 'admin' | 'member'
}

// Build each type FROM User with the built-in utility types. Don't retype the fields.
type UserUpdate = any    // every field optional, and no id (the id can't change)
type PublicUser = any    // User without password
type UserPreview = any   // only id and name
type UsersByRole = any   // { admin: User[]; member: User[] }, using User's role type

function updateUser(user: User, changes: UserUpdate): User {
  return { ...user, ...changes }
}

type UpdateArgs = any    // updateUser's parameter types, as a tuple
