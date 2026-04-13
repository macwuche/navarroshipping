import { useState, useEffect } from "react"
import { Link } from "wouter"
import { Search, Eye, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cnStatusToColor } from "@/lib/utils"
import { STATUS_LABELS, getStatusLabel } from "@/lib/shipmentStatuses"

export function ShipmentsPage() {
  const { toast } = useToast()
  const [shipments, setShipments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null)

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

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((s) => next.add(s.id))
        return next
      })
    }
  }

  const toggleOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const requestDelete = (ids: number[]) => setConfirmIds(ids)

  const confirmDelete = async () => {
    if (!confirmIds) return
    setIsDeleting(true)
    try {
      const res = await fetch("/api/shipments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: confirmIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setShipments((prev) => prev.filter((s) => !confirmIds.includes(s.id)))
      setSelected((prev) => {
        const next = new Set(prev)
        confirmIds.forEach((id) => next.delete(id))
        return next
      })
      toast({ title: "Deleted", description: data.message })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setConfirmIds(null)
    }
  }

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
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-muted border rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} shipment{selected.size > 1 ? "s" : ""} selected</span>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => requestDelete(Array.from(selected))}
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
        </div>
      )}

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
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </th>
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
                    <tr key={s.id} className={`border-b hover:bg-muted/50 ${selected.has(s.id) ? "bg-muted/30" : ""}`}>
                      <td className="py-3 px-4" onClick={(e) => toggleOne(s.id, e)}>
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => {}}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-sm font-medium">{s.trackingNumber}</td>
                      <td className="py-3 px-4 text-sm">{s.senderName}</td>
                      <td className="py-3 px-4 text-sm">{s.receiverName}</td>
                      <td className="py-3 px-4 text-sm">{s.weight} {s.weightUnit}</td>
                      <td className="py-3 px-4">
                        <Badge className={cnStatusToColor(s.status)}>{getStatusLabel(s.status)}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/tracking/${s.trackingNumber}`}>
                            <Button type="button" variant="ghost" size="sm" title="View tracking"><Eye className="h-4 w-4" /></Button>
                          </Link>
                          <Link href={`/admin/shipments/${s.id}/edit`}>
                            <Button type="button" variant="ghost" size="sm" title="Edit shipment"><Pencil className="h-4 w-4" /></Button>
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Delete shipment"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); requestDelete([s.id]) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Confirm delete dialog */}
      {confirmIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 mx-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Delete {confirmIds.length > 1 ? `${confirmIds.length} shipments` : "shipment"}?</h2>
              <p className="text-sm text-muted-foreground">
                This will permanently delete {confirmIds.length > 1 ? "these shipments" : "this shipment"} and all associated tracking events. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmIds(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Yes, delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
