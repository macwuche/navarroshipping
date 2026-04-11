import { useState, useEffect } from "react"

interface User {
  id: number
  email: string
  name: string
  role: "admin" | "staff" | "customer"
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verify session with server; fall back to localStorage if server is unreachable
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user)
          localStorage.setItem("user", JSON.stringify(data.user))
        } else {
          const stored = localStorage.getItem("user")
          if (stored) {
            try {
              setUser(JSON.parse(stored))
            } catch {
              localStorage.removeItem("user")
            }
          }
        }
      })
      .catch(() => {
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

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      // ignore
    }
    setUser(null)
    localStorage.removeItem("user")
  }

  return { user, isLoading, login, logout, isAuthenticated: !!user }
}
