import { useState, useEffect } from "react"
import { Search, ChevronRight, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useAuth } from "@/hooks/useAuth"

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  staff: "bg-blue-100 text-blue-700",
  customer: "bg-green-100 text-green-700",
}

export function UsersPage() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [userList, setUserList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null)

  useWebSocket((msg) => {
    if (msg.type === "user:new") {
      setUserList((prev) => [msg.user, ...prev])
    }
  })

  useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then(setUserList)
      .catch((err) => setError(err.message ?? "Failed to load users"))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = userList.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((u) => next.delete(u.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((u) => next.add(u.id))
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
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: confirmIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setUserList((prev) => prev.filter((u) => !confirmIds.includes(u.id)))
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
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">All registered accounts</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-muted border rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} user{selected.size > 1 ? "s" : ""} selected</span>
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
            <div className="text-center py-12 text-muted-foreground">Loading users...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">Error: {error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {userList.length === 0 ? "No users found." : "No users match your search."}
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isSelf = currentUser?.id === u.id
                    return (
                      <tr
                        key={u.id}
                        className={`border-b hover:bg-muted/50 ${selected.has(u.id) ? "bg-muted/30" : ""}`}
                      >
                        <td className="py-3 px-4" onClick={(e) => !isSelf && toggleOne(u.id, e)}>
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            disabled={isSelf}
                            onChange={() => {}}
                            className="rounded border-gray-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td
                          className="py-3 px-4 font-medium text-sm cursor-pointer"
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                        >
                          {u.name}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4">
                          <Badge className={roleBadgeColor[u.role] ?? ""}>{u.role}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View profile"
                              onClick={() => navigate(`/admin/users/${u.id}`)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={isSelf ? "Cannot delete your own account" : "Delete user"}
                              disabled={isSelf}
                              className="text-destructive hover:text-destructive disabled:opacity-40"
                              onClick={(e) => { e.stopPropagation(); requestDelete([u.id]) }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filtered.length} of {userList.length} users
        </p>
      )}

      {/* Confirm delete dialog */}
      {confirmIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 mx-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Delete {confirmIds.length > 1 ? `${confirmIds.length} users` : "user"}?</h2>
              <p className="text-sm text-muted-foreground">
                This will permanently delete {confirmIds.length > 1 ? "these accounts" : "this account"}. This action cannot be undone.
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
