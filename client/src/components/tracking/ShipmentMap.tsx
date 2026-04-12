import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapPoint {
  lat: number
  lng: number
  location: string
  status: string
  message: string
  timestamp: Date
}

interface Destination {
  lat: number
  lng: number
  address: string
}

interface ShipmentMapProps {
  points: MapPoint[]
  destination?: Destination
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    Pending_Collection: "#eab308",
    "Received Office": "#f97316",
    In_Transit: "#3b82f6",
    In_Warehouse: "#6366f1",
    Distribution: "#06b6d4",
    Available: "#22c55e",
    "On Route": "#8b5cf6",
    Approved: "#10b981",
    Pick_up: "#14b8a6",
    Quotation: "#0ea5e9",
    Pending_quote: "#f59e0b",
    Invoiced: "#7c3aed",
    Cancelled: "#ef4444",
    Pending_payment: "#f43f5e",
  }
  return colors[status] || "#6b7280"
}

const createCurrentMarkerIcon = (status: string) => {
  const color = getStatusColor(status)
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px; height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        animation: markerPulse 2s infinite;
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const createPastMarkerIcon = (status: string) => {
  const color = getStatusColor(status)
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 14px; height: 14px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        opacity: 0.75;
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

const createDestinationIcon = () =>
  L.divIcon({
    className: "custom-marker",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          width: 26px; height: 26px;
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  })

export function ShipmentMap({ points, destination }: ShipmentMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.Layer[]>([])

  useEffect(() => {
    if (!mapContainerRef.current || points.length === 0) return

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    const map = mapRef.current

    // Clear previous layers
    layersRef.current.forEach((l) => l.remove())
    layersRef.current = []

    // events are newest-first — index 0 is current position
    const currentPoint = points[0]

    // Draw past journey polyline (reverse so it goes oldest → newest)
    const journeyPoints = [...points].reverse()
    if (journeyPoints.length > 1) {
      const journeyLine = L.polyline(
        journeyPoints.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#3b82f6", weight: 3, opacity: 0.6 }
      ).addTo(map)
      layersRef.current.push(journeyLine)
    }

    // Draw dotted line from current position to destination
    if (destination) {
      const dottedLine = L.polyline(
        [[currentPoint.lat, currentPoint.lng], [destination.lat, destination.lng]],
        { color: "#ef4444", weight: 2.5, opacity: 0.7, dashArray: "8, 8" }
      ).addTo(map)
      layersRef.current.push(dottedLine)
    }

    // Add markers for past events (oldest first, skipping index 0 which is current)
    points.slice(1).forEach((point) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: createPastMarkerIcon(point.status),
      }).addTo(map)
      marker.bindPopup(`
        <div style="min-width:180px;">
          <strong>${point.location}</strong><br/>
          <span style="color:${getStatusColor(point.status)}">● ${point.status}</span><br/>
          <small>${point.message}</small><br/>
          <small>${new Date(point.timestamp).toLocaleString()}</small>
        </div>
      `)
      layersRef.current.push(marker)
    })

    // Current position marker (pulsing)
    const currentMarker = L.marker([currentPoint.lat, currentPoint.lng], {
      icon: createCurrentMarkerIcon(currentPoint.status),
    }).addTo(map)
    currentMarker.bindPopup(`
      <div style="min-width:180px;">
        <strong>📍 Current: ${currentPoint.location}</strong><br/>
        <span style="color:${getStatusColor(currentPoint.status)}">● ${currentPoint.status}</span><br/>
        <small>${currentPoint.message}</small><br/>
        <small>${new Date(currentPoint.timestamp).toLocaleString()}</small>
      </div>
    `)
    layersRef.current.push(currentMarker)

    // Destination marker
    if (destination) {
      const destMarker = L.marker([destination.lat, destination.lng], {
        icon: createDestinationIcon(),
      }).addTo(map)
      destMarker.bindPopup(`
        <div style="min-width:180px;">
          <strong>🏁 Destination</strong><br/>
          <small>${destination.address}</small>
        </div>
      `)
      layersRef.current.push(destMarker)
    }

    // Fit all visible points
    const allLatLngs: [number, number][] = points.map((p) => [p.lat, p.lng])
    if (destination) allLatLngs.push([destination.lat, destination.lng])
    if (allLatLngs.length > 0) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [50, 50] })
    }

    // Inject pulse animation once
    if (!document.getElementById("shipment-map-styles")) {
      const style = document.createElement("style")
      style.id = "shipment-map-styles"
      style.textContent = `
        @keyframes markerPulse {
          0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.7); }
          70%  { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      layersRef.current.forEach((l) => l.remove())
    }
  }, [points, destination])

  if (points.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No location data available</p>
      </div>
    )
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: "400px" }}
    />
  )
}
