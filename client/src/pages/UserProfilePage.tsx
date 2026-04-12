import { useState, useEffect } from "react"
import { useParams, useLocation } from "wouter"
import {
  ArrowLeft,
  Mail,
  Calendar,
  Package,
  ShieldCheck,
  User,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  staff: "bg-blue-100 text-blue-700",
  customer: "bg-green-100 text-green-700",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  pending:           { label: "Pending",          color: "bg-yellow-100 text-yellow-700", Icon: Clock },
  "in-transit":      { label: "In Transit",        color: "bg-blue-100 text-blue-700",    Icon: Truck },
  "out-for-delivery":{ label: "Out for Delivery",  color: "bg-purple-100 text-purple-700",Icon: Package },
  delivered:         { label: "Delivered",         color: "bg-green-100 text-green-700",  Icon: CheckCircle2 },
  exception:         { label: "Exception",         color: "bg-red-100 text-red-700",      Icon: AlertCircle },
  cancelled:         { label: "Cancelled",         color: "bg-gray-100 text-gray-500",    Icon: Archive },
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/users/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || `Error ${res.status}`)
        }
        return res.json()
      })
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-60 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">{error ?? "User not found"}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/admin/users")}>
          Back to Users
        </Button>
      </div>
    )
  }

  const shipments: any[] = profile.shipments ?? []
  const totalShipments = shipments.length
  const activeShipments = shipments.filter((s) =>
    ["pending", "in-transit", "out-for-delivery"].includes(s.status)
  ).length
  const deliveredShipments = shipments.filter((s) => s.status === "delivered").length

  return (
    <div className="space-y-6">
      {/* Back button + heading */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Users
        </Button>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-2xl font-bold">User Profile</h1>
      </div>

      {/* Profile hero */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-3xl font-bold shrink-0">
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white leading-tight">{profile.name}</h2>
              <div className="flex items-center gap-1.5 text-slate-300 text-sm mt-1">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>{profile.email}</span>
              </div>
              <div className="mt-2">
                <Badge className={`${roleBadgeColor[profile.role] ?? ""} capitalize`}>
                  {profile.role}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-3 divide-x border-t">
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalShipments}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Shipments</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeShipments}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Active</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{deliveredShipments}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Delivered</div>
          </div>
        </div>
      </Card>

      {/* Account details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Full Name</span>
            <span className="font-medium">{profile.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{profile.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Role</span>
            <Badge className={roleBadgeColor[profile.role] ?? ""}>{profile.role}</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Joined
            </span>
            <span className="font-medium">{formatDate(profile.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Shipments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Shipments
            {totalShipments > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {totalShipments} total
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {shipments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No shipments yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {shipments.map((s) => {
                const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG["pending"]
                const StatusIcon = cfg.Icon
                const latestEvent = s.trackingEvents?.[0]
                return (
                  <div key={s.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{s.trackingNumber}</span>
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        To: {s.receiverName} · {s.receiverAddress}
                      </div>
                      {latestEvent && (
                        <div className="text-xs text-muted-foreground mt-0.5 italic">
                          {latestEvent.message}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs text-muted-foreground">
                      <div>{formatDate(s.createdAt)}</div>
                      {s.estimatedDelivery && (
                        <div className="mt-0.5">Est. {formatDate(s.estimatedDelivery)}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
