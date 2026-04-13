import { ReactNode } from "react"
import { Truck } from "lucide-react"
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b bg-background flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">Navarro Shipping</span>
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar user={user} onLogout={onLogout} />
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
