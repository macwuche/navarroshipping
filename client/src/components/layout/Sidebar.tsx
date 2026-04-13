import { Link, useLocation } from "wouter"
import { Package, MapPin, Settings, Users, FileText, BarChart, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
  user?: { name: string; role: string }
  onLogout?: () => void
}

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: BarChart },
  { href: "/admin/shipments", label: "All Shipments", icon: Package },
  { href: "/admin/shipments/new", label: "Create Shipment", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/tracking", label: "Track Package", icon: MapPin },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ className, user, onLogout }: SidebarProps) {
  const [location] = useLocation()

  return (
    <aside className={cn("w-64 border-r bg-background min-h-full flex flex-col", className)}>
      <div className="p-4 flex-1">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.href
            return (
              <Link key={item.href} href={item.href}>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 pt-6 border-t">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Actions
          </div>
          <Link href="/admin/shipments/new">
            <button type="button" className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              + New Shipment
            </button>
          </Link>
        </div>
      </div>

      {/* User info + logout */}
      <div className="p-4 border-t">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
