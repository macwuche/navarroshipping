import { useState, useEffect, useContext, createContext } from "react"

interface User {
  id: number
  email: string
  name: string
  role: "admin" | "staff" | "customer"
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<any>
  register: (name: string, email: string, password: string) => Promise<any>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user)
          localStorage.setItem("user", JSON.stringify(data.user))
        } else {
          // Server says not authenticated — clear any stale local data
          localStorage.removeItem("user")
          setUser(null)
        }
      })
      .catch(() => {
        // Network error only — fall back to localStorage
        const stored = localStorage.getItem("user")
        if (stored) {
          try {
            setUser(JSON.parse(stored))
          } catch {
            localStorage.removeItem("user")
          }
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Login failed")
    }

    const data = await response.json()
    setUser(data.user)
    localStorage.setItem("user", JSON.stringify(data.user))
    return data
  }

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Registration failed")
    }

    const data = await response.json()
    setUser(data.user)
    localStorage.setItem("user", JSON.stringify(data.user))
    return data
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      // ignore network errors
    }
    setUser(null)
    localStorage.removeItem("user")
  }

  return { user, isLoading, login, register, logout, isAuthenticated: !!user }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
