import { Link, useLocation } from "wouter"
import { Package, Truck, Settings, LogOut, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavbarProps {
  user?: {
    name: string
    role: string
  }
  onLogout?: () => void
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const [location] = useLocation()

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Package },
    { href: "/admin/shipments", label: "Shipments", icon: Truck },
    { href: "/tracking", label: "Track", icon: Package },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/admin/dashboard" className="flex items-center space-x-2 mr-6">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-xl hidden sm:inline-block">Navarro Shipping</span>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center space-x-1 mr-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "gap-2",
                    !isActive && "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </div>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{user.name}</span>
              <span className="text-muted-foreground">({user.role})</span>
            </div>
            {onLogout && (
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
