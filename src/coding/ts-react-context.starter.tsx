import { createContext, useContext, useState, type ReactNode } from 'react'

type AuthContextValue = {
  user: { name: string } | null
  login: (name: string) => void
  logout: () => void
}

// 1. Create the context. Its value is undefined until a provider is above you.
const AuthContext = createContext(null)

// 2. Type the props (children) and the user state
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const value = {
    user,
    login: (name: string) => setUser({ name }),
    logout: () => setUser(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 3. Return AuthContextValue (never undefined): throw if there's no provider
function useAuth() {
  return useContext(AuthContext)
}
