import { useState, useEffect } from "react"
import { Link } from "wouter"
import { Search, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cnStatusToColor } from "@/lib/utils"

const statusLabels: Record<string, string> = {
  pending: "Pending",
  "in-transit": "In Transit",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  exception: "Exception",
  cancelled: "Cancelled",
}

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetch("/api/shipments", { credentials: "include" })
      .then((res) => res.ok ? res.json() : [])
      .then(setShipments)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = shipments.filter((s) => {
    const matchesSearch =
      s.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.receiverName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shipments</h1>
          <p className="text-muted-foreground">Manage all consignments</p>
        </div>
        <Link href="/admin/shipments/new">
          <Button>+ Create Shipment</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking #, sender, or receiver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-transit">In Transit</SelectItem>
                <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading shipments...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {shipments.length === 0 ? "No shipments yet. Create your first one!" : "No shipments match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tracking #</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sender</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Receiver</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Weight</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Est. Delivery</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm font-medium">{s.trackingNumber}</td>
                      <td className="py-3 px-4 text-sm">{s.senderName}</td>
                      <td className="py-3 px-4 text-sm">{s.receiverName}</td>
                      <td className="py-3 px-4 text-sm">{s.weight} {s.weightUnit}</td>
                      <td className="py-3 px-4">
                        <Badge className={cnStatusToColor(s.status)}>{statusLabels[s.status]}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/tracking/${s.trackingNumber}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
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

      {!isLoading && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filtered.length} of {shipments.length} shipments
        </p>
      )}
    </div>
  )
}
