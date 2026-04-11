import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Card } from "@/components/ui/card"

interface MapPoint {
  lat: number
  lng: number
  location: string
  status: string
  message: string
  timestamp: Date
}

interface ShipmentMapProps {
  points: MapPoint[]
}

// Custom marker icons
const createMarkerIcon = (isCurrent: boolean, status: string) => {
  const color = getStatusColor(status)

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${isCurrent ? "24px" : "16px"};
        height: ${isCurrent ? "24px" : "16px"};
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isCurrent ? "animation: pulse 2s infinite;" : ""}
      "></div>
    `,
    iconSize: [isCurrent ? 24 : 16, isCurrent ? 24 : 16],
    iconAnchor: [isCurrent ? 12 : 8, isCurrent ? 12 : 8],
  })
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "#eab308",
    "in-transit": "#3b82f6",
    "out-for-delivery": "#8b5cf6",
    delivered: "#22c55e",
    exception: "#ef4444",
    cancelled: "#6b7280",
  }
  return colors[status] || "#6b7280"
}

export function ShipmentMap({ points }: ShipmentMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapContainerRef.current || points.length === 0) return

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
      })

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(mapRef.current)
    }

    const map = mapRef.current

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Calculate bounds for fitting
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])

    // Add markers for each point
    points.forEach((point, index) => {
      const isCurrent = index === points.length - 1
      const marker = L.marker([point.lat, point.lng], {
        icon: createMarkerIcon(isCurrent, point.status),
      }).addTo(map)

      // Add popup
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong>${point.location}</strong><br/>
          <span style="color: ${getStatusColor(point.status)};">●</span> ${point.status}<br/>
          <small>${point.message}</small><br/>
          <small>${new Date(point.timestamp).toLocaleString()}</small>
        </div>
      `)

      markersRef.current.push(marker)

      // Add click handler
      marker.on("click", () => {
        console.log("Clicked:", point)
      })
    })

    // Draw polyline connecting points
    if (latlngs.length > 1) {
      L.polyline(latlngs, {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.7,
        dashArray: "10, 10",
      }).addTo(map)

      // Add animated marker for current position
      const currentPoint = points[points.length - 1]
      const pulseMarker = L.circleMarker([currentPoint.lat, currentPoint.lng], {
        radius: 8,
        color: getStatusColor(currentPoint.status),
        fillColor: getStatusColor(currentPoint.status),
        fillOpacity: 1,
        weight: 3,
        className: "pulse-marker",
      }).addTo(map)

      markersRef.current.push(pulseMarker)
    }

    // Fit map to show all points
    if (latlngs.length > 0) {
      const group = L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds(), { padding: [50, 50] })
    }

    // Add CSS animation for pulse effect
    const style = document.createElement("style")
    style.textContent = `
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
        }
      }
      .pulse-marker {
        animation: pulse 2s infinite;
      }
    `
    document.head.appendChild(style)

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
    }
  }, [points])

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
