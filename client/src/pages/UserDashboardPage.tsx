import { useState, useEffect } from "react"
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  Archive,
  User,
  Mail,
  Weight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShipmentMap } from "@/components/tracking/ShipmentMap"
import { useAuth } from "@/hooks/useAuth"
import { useWebSocket } from "@/hooks/useWebSocket"

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrackingEvent {
  id: number
  shipmentId: number
  status: string
  location: string
  latitude: string | null
  longitude: string | null
  message: string
  timestamp: string
}

interface Shipment {
  id: number
  customerId: number | null
  trackingNumber: string
  senderName: string
  senderAddress: string
  receiverName: string
  receiverAddress: string
  weight: string
  weightUnit: string
  description: string | null
  status: string
  estimatedDelivery: string | null
  actualDelivery: string | null
  createdAt: string
  trackingEvents: TrackingEvent[]
}

interface DashboardStats {
  total: number
  active: number
  delivered: number
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string; Icon: React.ElementType }> = {
  pending: {
    label: "Pending",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    Icon: Clock,
  },
  "in-transit": {
    label: "In Transit",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    Icon: Truck,
  },
  "out-for-delivery": {
    label: "Out for Delivery",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    Icon: Package,
  },
  delivered: {
    label: "Delivered",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    Icon: CheckCircle2,
  },
  exception: {
    label: "Exception",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    Icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    textColor: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    Icon: Archive,
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"]
  const { Icon, label, textColor, bgColor, borderColor } = cfg
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${bgColor} ${borderColor} ${textColor}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

const ACTIVE_STATUSES = ["pending", "in-transit", "out-for-delivery"]

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UserDashboardPage() {
  const { user } = useAuth()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, delivered: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipmentsRes, statsRes] = await Promise.all([
          fetch("/api/user/shipments", { credentials: "include" }),
          fetch("/api/user/dashboard", { credentials: "include" }),
        ])

        if (shipmentsRes.ok) {
          const data: Shipment[] = await shipmentsRes.json()
          setShipments(data)
          // Default to first active shipment, then first shipment overall
          const active = data.find((s) => ACTIVE_STATUSES.includes(s.status))
          setSelectedShipment(active ?? data[0] ?? null)
        }

        if (statsRes.ok) {
          setStats(await statsRes.json())
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Real-time updates: when a shipment belonging to this user is updated, patch local state
  useWebSocket((msg) => {
    if (msg.type !== "shipment:updated") return
    const updated: Shipment = msg.shipment
    if (updated.customerId !== user?.id) return

    setShipments((prev) => {
      const exists = prev.some((s) => s.id === updated.id)
      const next = exists
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [updated, ...prev]
      // Recalculate stats from the new list
      setStats({
        total: next.length,
        active: next.filter((s) => ["pending", "in-transit", "out-for-delivery"].includes(s.status)).length,
        delivered: next.filter((s) => s.status === "delivered").length,
      })
      return next
    })
    setSelectedShipment((prev) => (prev?.id === updated.id ? updated : prev))
  })

  // Build map points from selected shipment's tracking events (chronological order)
  const mapPoints =
    selectedShipment?.trackingEvents
      .filter((e) => e.latitude && e.longitude)
      .map((e) => ({
        lat: parseFloat(e.latitude!),
        lng: parseFloat(e.longitude!),
        location: e.location,
        status: e.status,
        message: e.message,
        timestamp: new Date(e.timestamp),
      }))
      .reverse() ?? []

  const latestEvent = selectedShipment?.trackingEvents[0] ?? null
  const firstName = user?.name?.split(" ")[0] ?? "there"

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {stats.active > 0
              ? `You have ${stats.active} active shipment${stats.active !== 1 ? "s" : ""} in progress`
              : "No active shipments right now"}
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex gap-3 shrink-0">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-xs text-blue-500 mt-0.5">Active</div>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-xs text-green-500 mt-0.5">Delivered</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total</div>
          </div>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white text-lg leading-tight">{user?.name}</div>
              <div className="flex items-center gap-1.5 text-blue-100 text-sm mt-0.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
                  <User className="h-3 w-3" />
                  Customer Account
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Shipment List ── */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Package className="h-4 w-4 text-gray-500" />
            Current Shipping Information
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : shipments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No shipments yet</p>
                <p className="text-xs mt-1 text-gray-400">
                  Your shipments will appear here once an admin creates one for you
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {shipments.map((shipment) => {
                const isSelected = selectedShipment?.id === shipment.id
                const isActive = ACTIVE_STATUSES.includes(shipment.status)
                return (
                  <button
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-150 hover:shadow-md ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 shadow-sm ring-1 ring-blue-300"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {shipment.trackingNumber}
                          </span>
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-start gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{shipment.receiverAddress}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>
                            {shipment.actualDelivery
                              ? `Delivered ${formatDate(shipment.actualDelivery)}`
                              : shipment.estimatedDelivery
                              ? `Est. ${formatDate(shipment.estimatedDelivery)}`
                              : "No delivery date set"}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={shipment.status} />
                    </div>
                    {shipment.trackingEvents.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-xs text-gray-500 line-clamp-1">
                        {shipment.trackingEvents[0].message}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: Map + Details ── */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <>
              <div className="h-72 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-48 rounded-xl bg-gray-200 animate-pulse" />
            </>
          ) : selectedShipment ? (
            <>
              {/* Map card */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-white">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Current Location
                    <span className="ml-auto font-mono text-xs text-gray-400 font-normal">
                      {selectedShipment.trackingNumber}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-72">
                    {mapPoints.length > 0 ? (
                      <ShipmentMap points={mapPoints} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-muted-foreground">
                        <MapPin className="h-10 w-10 opacity-15 mb-2" />
                        <p className="text-sm">No GPS data available yet</p>
                        <p className="text-xs text-gray-400 mt-1">Location will appear once the shipment is in transit</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Details card */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="text-sm font-medium text-gray-700">Shipment Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Status row */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <StatusBadge status={selectedShipment.status} />
                    </div>

                    {/* Tracking # row */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tracking Number</span>
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {selectedShipment.trackingNumber}
                      </span>
                    </div>

                    {/* Weight row */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Weight</span>
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5 text-gray-400" />
                        {selectedShipment.weight} {selectedShipment.weightUnit}
                      </span>
                    </div>

                    {/* From / To */}
                    <div className="border-t pt-3 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">From</div>
                        <div className="text-sm font-medium text-gray-800">{selectedShipment.senderName}</div>
                        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{selectedShipment.senderAddress}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">To</div>
                        <div className="text-sm font-medium text-gray-800">{selectedShipment.receiverName}</div>
                        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{selectedShipment.receiverAddress}</div>
                      </div>
                    </div>

                    {/* Estimated delivery */}
                    {(selectedShipment.estimatedDelivery || selectedShipment.actualDelivery) && (
                      <div className="border-t pt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {selectedShipment.actualDelivery ? "Delivered" : "Estimated Delivery"}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedShipment.actualDelivery ?? selectedShipment.estimatedDelivery)}
                        </span>
                      </div>
                    )}

                    {/* Latest tracking update */}
                    {latestEvent && (
                      <div className="border-t pt-3">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Latest Update
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <div>
                            <div className="text-sm text-gray-700">{latestEvent.message}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {latestEvent.location}
                              {latestEvent.location && " · "}
                              {formatDate(latestEvent.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {selectedShipment.description && (
                      <div className="border-t pt-3">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</div>
                        <div className="text-sm text-gray-600">{selectedShipment.description}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed flex items-center justify-center" style={{ minHeight: "320px" }}>
              <CardContent className="text-center text-muted-foreground py-12">
                <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a shipment to view details and location</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
