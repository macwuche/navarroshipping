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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex h-16 items-center px-4 sm:px-6">
          {/* Logo */}
          <Link href="/user/dashboard" className="flex items-center space-x-2 mr-8">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Truck className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">Navarro Shipping</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-1 mr-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location === item.href || (item.href !== "/user/dashboard" && location.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("gap-2", !isActive && "text-muted-foreground")}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>

          {/* User info + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
              </div>
              <div className="md:hidden h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {onLogout && (
                <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Logout</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
