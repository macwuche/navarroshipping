import { useState, useEffect } from "react"
import { Package, Truck, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import { cnStatusToColor } from "@/lib/utils"

const statusLabels: Record<string, string> = {
  pending: "Pending",
  "in-transit": "In Transit",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  exception: "Exception",
  cancelled: "Cancelled",
}

interface Stats {
  totalShipments: number
  inTransit: number
  delivered: number
  pending: number
  exceptions: number
  recentShipments: any[]
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/stats", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your shipping operations</p>
        </div>
        <Link href="/shipments/new">
          <Button>+ Create Shipment</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Shipments" value={stats?.totalShipments} icon={Package} description="All time" isLoading={isLoading} />
        <StatCard title="In Transit" value={stats?.inTransit} icon={Truck} description="Currently moving" isLoading={isLoading} />
        <StatCard title="Delivered" value={stats?.delivered} icon={CheckCircle} description="Successfully completed" isLoading={isLoading} />
        <StatCard title="Pending" value={stats?.pending} icon={Clock} description="Awaiting pickup" isLoading={isLoading} />
        <StatCard title="Exceptions" value={stats?.exceptions} icon={AlertTriangle} description="Requires attention" variant="destructive" isLoading={isLoading} />
      </div>

      {/* Recent Shipments */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Shipments</CardTitle>
              <CardDescription>Latest consignments in the system</CardDescription>
            </div>
            <Link href="/shipments">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !stats?.recentShipments?.length ? (
            <div className="text-center py-8 text-muted-foreground">No shipments yet. Create your first one!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tracking #</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Receiver</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Est. Delivery</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentShipments.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{s.trackingNumber}</td>
                      <td className="py-3 px-4">{s.receiverName}</td>
                      <td className="py-3 px-4">
                        <Badge className={cnStatusToColor(s.status)}>{statusLabels[s.status]}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/track/${s.trackingNumber}`}>
                          <Button variant="ghost" size="sm">Track</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title, value, icon: Icon, description, variant = "default", isLoading,
}: {
  title: string
  value?: number
  icon: React.ElementType
  description: string
  variant?: "default" | "destructive"
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isLoading ? "—" : (value ?? 0)}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
