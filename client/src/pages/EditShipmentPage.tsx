import { useState, useEffect } from "react"
import { useParams, useLocation } from "wouter"
import { ArrowLeft, Loader2, MapPin, Mail, Package, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cnStatusToColor } from "@/lib/utils"
import { STATUS_LABELS, getStatusLabel } from "@/lib/shipmentStatuses"
import { LocationPickerMap } from "@/components/tracking/LocationPickerMap"

type Tab = "info" | "location" | "email"

export function EditShipmentPage() {
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>("info")
  const [shipment, setShipment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // ── Info form ──────────────────────────────────────────────────────────────
  const [info, setInfo] = useState({
    senderName: "", senderAddress: "", senderPhone: "", senderEmail: "",
    receiverName: "", receiverAddress: "", receiverPhone: "", receiverEmail: "",
    weight: "", weightUnit: "kg", description: "", estimatedDelivery: "", status: "Pending_Collection",
    destinationLatitude: "", destinationLongitude: "",
  })

  // ── Location / tracking event form ────────────────────────────────────────
  const [locationForm, setLocationForm] = useState({
    status: "In_Transit", location: "", latitude: "", longitude: "", message: "",
  })
  const [isSavingLocation, setIsSavingLocation] = useState(false)

  // ── Email form ────────────────────────────────────────────────────────────
  const [emailForm, setEmailForm] = useState({
    recipients: [] as ("sender" | "recipient")[],
    subject: "",
    message: "",
  })
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // ── Load shipment ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/shipments/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load shipment")
        return res.json()
      })
      .then((data) => {
        setShipment(data)
        setInfo({
          senderName: data.senderName ?? "",
          senderAddress: data.senderAddress ?? "",
          senderPhone: data.senderPhone ?? "",
          senderEmail: data.senderEmail ?? "",
          receiverName: data.receiverName ?? "",
          receiverAddress: data.receiverAddress ?? "",
          receiverPhone: data.receiverPhone ?? "",
          receiverEmail: data.receiverEmail ?? "",
          weight: data.weight ?? "",
          weightUnit: data.weightUnit ?? "kg",
          description: data.description ?? "",
          estimatedDelivery: data.estimatedDelivery
            ? new Date(data.estimatedDelivery).toISOString().slice(0, 10)
            : "",
          status: data.status ?? "Pending_Collection",
          destinationLatitude: data.destinationLatitude ?? "",
          destinationLongitude: data.destinationLongitude ?? "",
        })
        setLocationForm((prev) => ({ ...prev, status: data.status ?? "In_Transit" }))
        setEmailForm((prev) => ({
          ...prev,
          subject: `Update on your shipment ${data.trackingNumber}`,
          message: `Your shipment ${data.trackingNumber} has been updated. Current status: ${getStatusLabel(data.status)}.`,
        }))
      })
      .catch(() => toast({ title: "Error", description: "Could not load shipment", variant: "destructive" }))
      .finally(() => setIsLoading(false))
  }, [id])

  // ── Save shipment info ─────────────────────────────────────────────────────
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...info,
          weight: info.weight,
          estimatedDelivery: info.estimatedDelivery || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message)
      }
      const updated = await res.json()
      setShipment((prev: any) => ({ ...prev, ...updated }))
      toast({ title: "Saved", description: "Shipment information updated." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Save failed", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Add location update ───────────────────────────────────────────────────
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationForm.location || !locationForm.message) {
      toast({ title: "Missing fields", description: "Location and message are required.", variant: "destructive" })
      return
    }
    setIsSavingLocation(true)
    try {
      const res = await fetch(`/api/shipments/${id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: locationForm.status,
          location: locationForm.location,
          latitude: locationForm.latitude || undefined,
          longitude: locationForm.longitude || undefined,
          message: locationForm.message,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message)
      }
      toast({ title: "Location updated", description: `Status set to ${getStatusLabel(locationForm.status)}.` })
      setInfo((prev) => ({ ...prev, status: locationForm.status }))
      setShipment((prev: any) => ({ ...prev, status: locationForm.status }))
      setLocationForm((prev) => ({ ...prev, location: "", latitude: "", longitude: "", message: "" }))
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
    } finally {
      setIsSavingLocation(false)
    }
  }

  // ── Send email ────────────────────────────────────────────────────────────
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailForm.recipients.length) {
      toast({ title: "Select recipients", description: "Choose at least one recipient.", variant: "destructive" })
      return
    }
    setIsSendingEmail(true)
    try {
      const res = await fetch(`/api/shipments/${id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(emailForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast({ title: "Email sent", description: data.message })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to send", variant: "destructive" })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const toggleRecipient = (r: "sender" | "recipient") => {
    setEmailForm((prev) => ({
      ...prev,
      recipients: prev.recipients.includes(r)
        ? prev.recipients.filter((x) => x !== r)
        : [...prev.recipients, r],
    }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>Shipment not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/admin/shipments")}>
          Back to Shipments
        </Button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "info",     label: "Shipment Info",    icon: Package },
    { id: "location", label: "Update Location",  icon: MapPin  },
    { id: "email",    label: "Send Email",        icon: Mail    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/shipments")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Shipments
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Edit Shipment</h1>
            <span className="font-mono text-sm text-muted-foreground">{shipment.trackingNumber}</span>
            <Badge className={cnStatusToColor(shipment.status)}>{getStatusLabel(shipment.status)}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Shipment Info ── */}
      {activeTab === "info" && (
        <form onSubmit={handleSaveInfo}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sender */}
            <Card>
              <CardHeader><CardTitle>Sender</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={info.senderName} onChange={(e) => setInfo((p) => ({ ...p, senderName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Textarea value={info.senderAddress} onChange={(e) => setInfo((p) => ({ ...p, senderAddress: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={info.senderPhone} onChange={(e) => setInfo((p) => ({ ...p, senderPhone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={info.senderEmail} onChange={(e) => setInfo((p) => ({ ...p, senderEmail: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receiver */}
            <Card>
              <CardHeader><CardTitle>Recipient</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={info.receiverName} onChange={(e) => setInfo((p) => ({ ...p, receiverName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Textarea value={info.receiverAddress} onChange={(e) => setInfo((p) => ({ ...p, receiverAddress: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={info.receiverPhone} onChange={(e) => setInfo((p) => ({ ...p, receiverPhone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={info.receiverEmail} onChange={(e) => setInfo((p) => ({ ...p, receiverEmail: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package details */}
            <Card>
              <CardHeader><CardTitle>Package Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight *</Label>
                    <Input type="number" step="0.01" min="0" value={info.weight} onChange={(e) => setInfo((p) => ({ ...p, weight: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={info.weightUnit} onValueChange={(v) => setInfo((p) => ({ ...p, weightUnit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lbs">lbs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={info.description} onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))} rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Status & delivery */}
            <Card>
              <CardHeader><CardTitle>Status & Delivery</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={info.status} onValueChange={(v) => setInfo((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Delivery Date</Label>
                  <Input type="date" value={info.estimatedDelivery} onChange={(e) => setInfo((p) => ({ ...p, estimatedDelivery: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Destination Coordinates <span className="text-muted-foreground text-xs">(used for map)</span></Label>
                  <p className="text-xs text-muted-foreground">Use negative values for West longitude (e.g. USA: 38.7946, -106.5348) and South latitude.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Latitude (N=positive, S=negative)</Label>
                      <Input type="number" step="any" placeholder="e.g. 38.7946" value={info.destinationLatitude} onChange={(e) => setInfo((p) => ({ ...p, destinationLatitude: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Longitude (E=positive, W=negative)</Label>
                      <Input type="number" step="any" placeholder="e.g. -106.5348" value={info.destinationLongitude} onChange={(e) => setInfo((p) => ({ ...p, destinationLongitude: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Tab: Update Location ── */}
      {activeTab === "location" && (
        <form onSubmit={handleAddLocation}>
          <Card>
            <CardHeader>
              <CardTitle>Add Location Update</CardTitle>
              <CardDescription>This adds a new event to the tracking timeline and updates the shipment status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Status *</Label>
                <Select value={locationForm.status} onValueChange={(v) => setLocationForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Location *</Label>
                <Input
                  placeholder="e.g. Lagos Distribution Center"
                  value={locationForm.location}
                  onChange={(e) => setLocationForm((p) => ({ ...p, location: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Pick Location on Map</Label>
                <LocationPickerMap
                  onConfirm={(picked) => {
                    setLocationForm((p) => ({
                      ...p,
                      latitude: String(picked.lat),
                      longitude: String(picked.lng),
                      location: picked.displayName,
                    }))
                  }}
                />
                {/* Show confirmed coordinates as read-only */}
                {locationForm.latitude && locationForm.longitude && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Coordinates set: {parseFloat(locationForm.latitude).toFixed(6)}, {parseFloat(locationForm.longitude).toFixed(6)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  placeholder="e.g. Package arrived at sorting facility"
                  value={locationForm.message}
                  onChange={(e) => setLocationForm((p) => ({ ...p, message: e.target.value }))}
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSavingLocation} className="gap-2">
              {isSavingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {isSavingLocation ? "Saving…" : "Add Location Update"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Tab: Send Email ── */}
      {activeTab === "email" && (
        <form onSubmit={handleSendEmail}>
          <Card>
            <CardHeader>
              <CardTitle>Send Email Notification</CardTitle>
              <CardDescription>Send an update email to the sender, recipient, or both.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients *</Label>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleRecipient("sender")}
                    className={`flex flex-col items-start px-4 py-3 rounded-lg border text-sm transition-colors ${
                      emailForm.recipients.includes("sender")
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">Sender</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {shipment.senderEmail || <span className="italic">No email on file</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRecipient("recipient")}
                    className={`flex flex-col items-start px-4 py-3 rounded-lg border text-sm transition-colors ${
                      emailForm.recipients.includes("recipient")
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">Recipient</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {shipment.receiverEmail || <span className="italic">No email on file</span>}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm((p) => ({ ...p, message: e.target.value }))}
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The email will include shipment details (tracking number, status, addresses, estimated delivery) automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSendingEmail} className="gap-2">
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isSendingEmail ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
