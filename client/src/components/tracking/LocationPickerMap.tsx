import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPin, Loader2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PickedLocation {
  lat: number
  lng: number
  displayName: string
}

interface LocationPickerMapProps {
  onConfirm: (location: PickedLocation) => void
}

export function LocationPickerMap({ onConfirm }: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [pending, setPending] = useState<PickedLocation | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapRef.current = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(mapRef.current)

    mapRef.current.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng

      // Place/move the marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="
              width:20px;height:20px;
              background:#3b82f6;
              border:3px solid white;
              border-radius:50%;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(mapRef.current!)
      }

      setPending(null)
      setIsGeocoding(true)

      // Reverse geocode via Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "Accept-Language": "en" } }
        )
        const data = await res.json()
        const displayName: string =
          data.display_name ??
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`

        setPending({ lat, lng, displayName })
      } catch {
        setPending({
          lat,
          lng,
          displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        })
      } finally {
        setIsGeocoding(false)
      }
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  const handleConfirm = () => {
    if (!pending) return
    onConfirm(pending)
    // Clear pin
    markerRef.current?.remove()
    markerRef.current = null
    setPending(null)
  }

  const handleCancel = () => {
    markerRef.current?.remove()
    markerRef.current = null
    setPending(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        Click anywhere on the map to set the current location
      </div>

      <div
        ref={mapContainerRef}
        className="w-full rounded-lg border overflow-hidden"
        style={{ height: "320px" }}
      />

      {/* Confirmation card */}
      {(isGeocoding || pending) && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          {isGeocoding ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking up location…
            </div>
          ) : pending ? (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Location</p>
                <p className="text-sm font-medium leading-snug">{pending.displayName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {pending.lat.toFixed(6)}, {pending.lng.toFixed(6)}
                </p>
              </div>
              <p className="text-sm font-medium">Is this the correct location?</p>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={handleConfirm}>
                  <Check className="h-3.5 w-3.5" />
                  Yes, use this location
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
