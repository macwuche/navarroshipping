import { ReactNode } from "react"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"

interface LayoutProps {
  children: ReactNode
  user?: {
    name: string
    role: string
  }
  onLogout?: () => void
}

export function Layout({ children, user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-6">
        {children}
      </div>
    </div>
  )
}
