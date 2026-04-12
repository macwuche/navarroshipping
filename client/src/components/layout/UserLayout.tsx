import { ReactNode } from "react"
import { Link, useLocation } from "wouter"
import { Truck, Package, Search, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UserLayoutProps {
  children: ReactNode
  user?: {
    name: string
    email: string
    role: string
  }
  onLogout?: () => void
}

export function UserLayout({ children, user, onLogout }: UserLayoutProps) {
  const [location] = useLocation()

  const navItems = [
    { href: "/user/dashboard", label: "My Shipments", icon: Package },
    { href: "/tracking", label: "Track Package", icon: Search },
  ]

  const allNavItems = [
    ...navItems,
    ...(user ? [{ href: "/user/profile", label: user.name, icon: User, isProfile: true }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Top Nav Bar with centered logo */}
      <header className="bg-white border-b">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">Navarro Shipping</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-7xl mx-auto px-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.href || (item.href !== "/user/dashboard" && location.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            )
          })}

          {/* Logout button as a nav item */}
          {user && onLogout && (
            <button onClick={onLogout} className="flex-1">
              <div className="flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-muted-foreground transition-colors hover:text-foreground">
                <LogOut className="h-5 w-5" />
                <span className="text-xs font-medium">Logout</span>
              </div>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
