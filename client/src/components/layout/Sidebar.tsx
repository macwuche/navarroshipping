import { Link, useLocation } from "wouter"
import { Package, Truck, MapPin, Settings, Users, FileText, BarChart } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: BarChart },
  { href: "/admin/shipments", label: "All Shipments", icon: Package },
  { href: "/admin/shipments/new", label: "Create Shipment", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/tracking", label: "Track Package", icon: MapPin },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation()

  return (
    <aside className={cn("w-64 border-r bg-background min-h-full", className)}>
      <div className="p-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.href
            return (
              <Link key={item.href} href={item.href}>
                <button
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
            <button className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              + New Shipment
            </button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
