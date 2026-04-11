import { useState, useEffect } from "react"
import { useParams, Link } from "wouter"
import { MapPin, Package, Truck, CheckCircle, Clock, AlertTriangle, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { ShipmentMap } from "@/components/tracking/ShipmentMap"
import { cnStatusToColor, formatDate } from "@/lib/utils"
import type { TrackingEvent } from "@shared/types"


const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  "in-transit": Truck,
  "out-for-delivery": Truck,
  delivered: CheckCircle,
  exception: AlertTriangle,
  cancelled: AlertTriangle,
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  "in-transit": "In Transit",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  exception: "Exception",
  cancelled: "Cancelled",
}

export function TrackPage() {
  const params = useParams<{ trackingNumber?: string }>()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState(params.trackingNumber || "")
  const [trackingNumber, setTrackingNumber] = useState<string | null>(params.trackingNumber || null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
        return
      }
      const data = await res.json()
      const evts = (data.trackingEvents || []).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }))
      setEvents(evts)
      setTrackingNumber(data.trackingNumber)
    } catch {
      toast({ title: "Error", description: "Failed to fetch tracking data", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const currentStatus = events.length > 0 ? events[events.length - 1].status : null

  // Extract coordinates for map
  const mapPoints = events
    .filter((e) => e.latitude && e.longitude)
    .map((e) => ({
      lat: parseFloat(e.latitude!),
      lng: parseFloat(e.longitude!),
      location: e.location,
      status: e.status,
      message: e.message,
      timestamp: e.timestamp,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Track Your Shipment</h1>
        <p className="text-muted-foreground">Real-time tracking with location history</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter tracking number (e.g., NS7K9X2M4P)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-lg"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Track"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {trackingNumber && events.length > 0 && (
        <>
          {/* Current Status */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Tracking: {trackingNumber}
                  </CardTitle>
                  <CardDescription>
                    Current status:{" "}
                    <Badge className={cnStatusToColor(currentStatus!)}>
                      {statusLabels[currentStatus!]}
                    </Badge>
                  </CardDescription>
                </div>
                {currentStatus && (() => {
                  const StatusIcon = statusIcons[currentStatus]
                  return (
                    <div className="bg-primary/10 p-3 rounded-full">
                      <StatusIcon className="h-8 w-8 text-primary" />
                    </div>
                  )
                })()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 h-[400px]">
                <ShipmentMap points={mapPoints} />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking History</CardTitle>
              <CardDescription>Complete journey timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.slice().reverse().map((event, index) => {
                  const StatusIcon = statusIcons[event.status]
                  const isLast = index === events.length - 1

                  return (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isLast ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        {!isLast && <div className="w-0.5 h-full bg-muted mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{event.location}</p>
                            <p className="text-sm text-muted-foreground">{event.message}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={cnStatusToColor(event.status)}>
                              {statusLabels[event.status]}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!trackingNumber && (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Enter a tracking number</h3>
            <p className="text-muted-foreground">
              Enter a tracking number to see live shipment status and location history.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
