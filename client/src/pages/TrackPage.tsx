import { useState } from "react"
import { useParams } from "wouter"
import { MapPin, Package, Truck, CheckCircle, Clock, AlertTriangle, Search, Warehouse, CircleDot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { ShipmentMap } from "@/components/tracking/ShipmentMap"
import { cnStatusToColor, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { TrackingEvent } from "@shared/types"
import { useWebSocket } from "@/hooks/useWebSocket"

const statusIcons: Record<string, React.ElementType> = {
  Pending_Collection: Clock,
  "Received Office": Package,
  In_Transit: Truck,
  In_Warehouse: Warehouse,
  Distribution: Truck,
  Available: CheckCircle,
  "On Route": Truck,
  Approved: CheckCircle,
  Pick_up: Package,
  Quotation: CircleDot,
  Pending_quote: Clock,
  Invoiced: CircleDot,
  Cancelled: AlertTriangle,
  Pending_payment: Clock,
}

const statusLabels: Record<string, string> = {
  Pending_Collection: "Pending Collection",
  "Received Office": "Received Office",
  In_Transit: "In Transit",
  In_Warehouse: "In Warehouse",
  Distribution: "Distribution",
  Available: "Available",
  "On Route": "On Route",
  Approved: "Approved",
  Pick_up: "Pick Up",
  Quotation: "Quotation",
  Pending_quote: "Pending Quote",
  Invoiced: "Invoiced",
  Cancelled: "Cancelled",
  Pending_payment: "Pending Payment",
}

const statusColors: Record<string, string> = {
  Pending_Collection: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Received Office": "bg-orange-50 text-orange-700 border-orange-200",
  In_Transit: "bg-blue-50 text-blue-700 border-blue-200",
  In_Warehouse: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Distribution: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Available: "bg-green-50 text-green-700 border-green-200",
  "On Route": "bg-purple-50 text-purple-700 border-purple-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pick_up: "bg-teal-50 text-teal-700 border-teal-200",
  Quotation: "bg-sky-50 text-sky-700 border-sky-200",
  Pending_quote: "bg-amber-50 text-amber-700 border-amber-200",
  Invoiced: "bg-violet-50 text-violet-700 border-violet-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Pending_payment: "bg-rose-50 text-rose-700 border-rose-200",
}

const statusBg: Record<string, string> = {
  Pending_Collection: "bg-yellow-500",
  "Received Office": "bg-orange-500",
  In_Transit: "bg-blue-500",
  In_Warehouse: "bg-indigo-500",
  Distribution: "bg-cyan-500",
  Available: "bg-green-500",
  "On Route": "bg-purple-500",
  Approved: "bg-emerald-500",
  Pick_up: "bg-teal-500",
  Quotation: "bg-sky-500",
  Pending_quote: "bg-amber-500",
  Invoiced: "bg-violet-500",
  Cancelled: "bg-red-500",
  Pending_payment: "bg-rose-500",
}

export function TrackPage() {
  const params = useParams<{ trackingNumber?: string }>()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState(params.trackingNumber || "")
  const [trackingNumber, setTrackingNumber] = useState<string | null>(params.trackingNumber || null)
  const [shipmentData, setShipmentData] = useState<any>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Real-time updates: if the currently tracked shipment is updated, patch state live
  useWebSocket((msg) => {
    if (msg.type !== "shipment:updated") return
    const updated = msg.shipment
    if (updated.trackingNumber !== trackingNumber) return

    const evts: TrackingEvent[] = (updated.trackingEvents ?? []).map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }))
    setEvents(evts)
    setShipmentData(updated)
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) {
      toast({ title: "Enter tracking number", description: "Please enter a valid tracking number", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/track/${searchTerm.trim().toUpperCase()}`)
      if (!res.ok) {
        toast({ title: "Not found", description: "No shipment found with that tracking number", variant: "destructive" })
        setEvents([])
        setTrackingNumber(null)
        setShipmentData(null)
        return
      }
      const data = await res.json()
      const evts = (data.trackingEvents || []).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }))
      setEvents(evts)
      setTrackingNumber(data.trackingNumber)
      setShipmentData(data)
    } catch {
      toast({ title: "Error", description: "Failed to fetch tracking data", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const currentStatus = events.length > 0 ? events[0].status : null
  const latestEvent = events[0] ?? null

  const mapPoints = events
    .filter((e) => e.latitude && e.longitude)
    .map((e) => ({
      lat: parseFloat(e.latitude as unknown as string),
      lng: parseFloat(e.longitude as unknown as string),
      location: e.location,
      status: e.status,
      message: e.message,
      timestamp: e.timestamp,
    }))

  const mapDestination =
    shipmentData?.destinationLatitude && shipmentData?.destinationLongitude
      ? {
          lat: parseFloat(shipmentData.destinationLatitude),
          lng: parseFloat(shipmentData.destinationLongitude),
          address: shipmentData.receiverAddress ?? "Destination",
        }
      : undefined

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Track Package</h1>
        <p className="text-muted-foreground text-sm">Enter your tracking number below</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="e.g. NS7K9X2M4P"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="shrink-0">
          {isLoading ? "..." : "Track"}
        </Button>
      </form>

      {/* Results */}
      {trackingNumber && events.length > 0 && currentStatus && (
        <div className="space-y-4">

          {/* Status card + Map — side by side on desktop, map first on mobile */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Map — order-1 on mobile (shows first), order-2 on desktop (shows right) */}
            {mapPoints.length > 0 && (
              <div className="order-1 md:order-2 md:flex-1 rounded-2xl overflow-hidden" style={{ minHeight: "280px" }}>
                <ShipmentMap points={mapPoints} destination={mapDestination} />
              </div>
            )}

            {/* Status hero card — order-2 on mobile (shows below map), order-1 on desktop (shows left) */}
            <div className={cn("order-2 md:order-1 md:w-80 rounded-2xl border p-5 shrink-0", statusColors[currentStatus])}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70">Tracking Number</p>
                  <p className="font-mono font-bold text-lg">{trackingNumber}</p>
                </div>
                <div className={cn("p-3 rounded-full", statusBg[currentStatus] ?? "bg-gray-500", "text-white")}>
                  {(() => { const Icon = statusIcons[currentStatus] ?? CircleDot; return <Icon className="h-6 w-6" /> })()}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">Current Status</p>
                <p className="font-semibold text-xl">{statusLabels[currentStatus] ?? currentStatus}</p>
                {latestEvent && (
                  <p className="text-sm opacity-80 mt-0.5">{latestEvent.location} · {formatDate(latestEvent.timestamp)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipment details */}
          {shipmentData && (
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">From</p>
                  <p className="font-medium">{shipmentData.senderName}</p>
                  <p className="text-muted-foreground text-xs">{shipmentData.senderAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">To</p>
                  <p className="font-medium">{shipmentData.receiverName}</p>
                  <p className="text-muted-foreground text-xs">{shipmentData.receiverAddress}</p>
                </div>
                {shipmentData.weight && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Weight</p>
                    <p className="font-medium">{shipmentData.weight} {shipmentData.weightUnit}</p>
                  </div>
                )}
                {shipmentData.estimatedDelivery && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Est. Delivery</p>
                    <p className="font-medium">{formatDate(new Date(shipmentData.estimatedDelivery))}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">Tracking History</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-0">
                {events.map((event, index) => {
                  const StatusIcon = statusIcons[event.status] ?? CircleDot
                  const isFirst = index === 0
                  const isLast = index === events.length - 1

                  return (
                    <div key={event.id} className="flex gap-3">
                      {/* Timeline spine */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                          isFirst ? cn(statusBg[event.status], "text-white") : "bg-muted text-muted-foreground"
                        )}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                      </div>

                      {/* Content */}
                      <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn("font-medium text-sm", !isFirst && "text-muted-foreground")}>{event.location}</p>
                            <p className="text-xs text-muted-foreground">{event.message}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className={cn("text-xs", cnStatusToColor(event.status))}>
                              {statusLabels[event.status] ?? event.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(event.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!trackingNumber && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-muted rounded-full p-5 mb-4">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Track your shipment</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Enter your tracking number above to see real-time status and location updates.
          </p>
        </div>
      )}
    </div>
  )
}
