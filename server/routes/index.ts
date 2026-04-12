import { Router } from "express"
import { eq, desc, count, and, inArray } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "../db/schema"
import { users, shipments, trackingEvents, settings } from "../db/schema"
import { isAuthenticated, isAdmin } from "../middleware"
import nodemailer from "nodemailer"

function createTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  })
}

function shipmentEmailHtml(shipment: any, heading: string, body: string) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:#1e293b;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px">Navarro Shipping</h1>
      </div>
      <div style="padding:32px">
        <h2 style="margin-top:0">${heading}</h2>
        <p>${body}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f8fafc;font-weight:600;width:40%">Tracking Number</td><td style="padding:8px">${shipment.trackingNumber}</td></tr>
          <tr><td style="padding:8px;font-weight:600">Status</td><td style="padding:8px;text-transform:capitalize">${shipment.status.replace(/-/g," ")}</td></tr>
          <tr><td style="padding:8px;background:#f8fafc;font-weight:600">From</td><td style="padding:8px">${shipment.senderName}</td></tr>
          <tr><td style="padding:8px;font-weight:600">To</td><td style="padding:8px">${shipment.receiverName} · ${shipment.receiverAddress}</td></tr>
          ${shipment.estimatedDelivery ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600">Est. Delivery</td><td style="padding:8px">${new Date(shipment.estimatedDelivery).toLocaleDateString()}</td></tr>` : ""}
        </table>
        <p style="color:#6b7280;font-size:14px">If you have questions, reply to this email.</p>
      </div>
    </div>`
}

export function createRouter(db: NodePgDatabase<typeof schema>, broadcast: (data: object) => void = () => {}) {
  const router = Router()

  async function broadcastShipment(id: number) {
    try {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, id),
        with: { trackingEvents: { orderBy: [desc(trackingEvents.timestamp)] } },
      })
      if (shipment) broadcast({ type: "shipment:updated", shipment })
    } catch {
      // non-critical — don't fail the request if broadcast fails
    }
  }

  // --- Dashboard ---
  router.get("/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const [total] = await db.select({ count: count() }).from(shipments)
      const [inTransit] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "In_Transit"))
      const [delivered] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "Available"))
      const [pending] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "Pending_Collection"))
      const [exceptions] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "Cancelled"))
      const recent = await db.query.shipments.findMany({
        orderBy: [desc(shipments.createdAt)],
        limit: 5,
      })
      res.json({
        totalShipments: Number(total.count),
        inTransit: Number(inTransit.count),
        delivered: Number(delivered.count),
        pending: Number(pending.count),
        exceptions: Number(exceptions.count),
        recentShipments: recent,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Failed to fetch stats" })
    }
  })

  // --- Shipments ---
  router.get("/shipments", isAuthenticated, async (req, res) => {
    try {
      const all = await db.query.shipments.findMany({
        orderBy: [desc(shipments.createdAt)],
        limit: 200,
      })
      res.json(all)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipments" })
    }
  })

  router.post("/shipments", isAuthenticated, async (req, res) => {
    try {
      const {
        senderName, senderAddress, senderPhone, senderEmail,
        receiverName, receiverAddress, receiverPhone, receiverEmail,
        weight, weightUnit, dimensions, description, estimatedDelivery,
      } = req.body

      if (!senderName || !senderAddress || !receiverName || !receiverAddress || !weight) {
        return res.status(400).json({ message: "Missing required fields" })
      }

      const trackingNumber =
        "NS" +
        Math.random().toString(36).substring(2, 8).toUpperCase() +
        Date.now().toString(36).substring(4).toUpperCase()

      const [shipment] = await db.insert(shipments).values({
        trackingNumber,
        senderName,
        senderAddress,
        senderPhone: senderPhone || null,
        senderEmail: senderEmail || null,
        receiverName,
        receiverAddress,
        receiverPhone: receiverPhone || null,
        receiverEmail: receiverEmail || null,
        weight: weight.toString(),
        weightUnit: weightUnit || "kg",
        dimensions: dimensions || null,
        description: description || null,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        customerId: (req.user as any)?.id || null,
      }).returning()

      // Create initial tracking event
      await db.insert(trackingEvents).values({
        shipmentId: shipment.id,
        status: "Pending_Collection",
        location: senderAddress.split(",")[0] || "Origin",
        message: "Shipment created and ready for pickup",
        createdBy: (req.user as any)?.id || null,
      })

      res.status(201).json(shipment)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Failed to create shipment" })
    }
  })

  router.get("/shipments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" })

      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, id),
        with: { trackingEvents: { orderBy: [desc(trackingEvents.timestamp)] } },
      })

      if (!shipment) return res.status(404).json({ message: "Shipment not found" })
      res.json(shipment)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipment" })
    }
  })

  router.put("/shipments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" })

      const allowed = [
        "status", "estimatedDelivery", "actualDelivery", "description",
        "senderName", "senderAddress", "senderPhone", "senderEmail",
        "receiverName", "receiverAddress", "receiverPhone", "receiverEmail",
        "weight", "weightUnit", "dimensions",
        "destinationLatitude", "destinationLongitude",
      ]
      const updates: Record<string, any> = { updatedAt: new Date() }
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key] === "" ? null : req.body[key]
      }
      if (updates.weight) updates.weight = updates.weight.toString()

      const [updated] = await db.update(shipments).set(updates).where(eq(shipments.id, id)).returning()
      if (!updated) return res.status(404).json({ message: "Shipment not found" })
      broadcastShipment(id)
      res.json(updated)
    } catch (error) {
      res.status(500).json({ message: "Failed to update shipment" })
    }
  })

  // Send email notification to sender and/or recipient
  router.post("/shipments/:id/email", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" })

      const { recipients, subject, message } = req.body as {
        recipients: ("sender" | "recipient")[]
        subject: string
        message: string
      }

      if (!recipients?.length || !subject || !message) {
        return res.status(400).json({ message: "recipients, subject, and message are required" })
      }

      const shipment = await db.query.shipments.findFirst({ where: eq(shipments.id, id) })
      if (!shipment) return res.status(404).json({ message: "Shipment not found" })

      const transport = createTransport()
      if (!transport) {
        return res.status(503).json({
          message: "Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.",
        })
      }

      const from = process.env.SMTP_FROM || process.env.SMTP_USER
      const toAddresses: string[] = []

      if (recipients.includes("sender") && shipment.senderEmail) toAddresses.push(shipment.senderEmail)
      if (recipients.includes("recipient") && shipment.receiverEmail) toAddresses.push(shipment.receiverEmail)

      if (!toAddresses.length) {
        return res.status(400).json({ message: "No email addresses available for selected recipients" })
      }

      await transport.sendMail({
        from,
        to: toAddresses.join(", "),
        subject,
        html: shipmentEmailHtml(shipment, subject, message),
      })

      res.json({ message: `Email sent to ${toAddresses.join(", ")}` })
    } catch (error) {
      console.error("Email error:", error)
      res.status(500).json({ message: "Failed to send email" })
    }
  })

  router.delete("/shipments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      await db.delete(shipments).where(eq(shipments.id, id))
      res.json({ message: "Shipment deleted" })
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shipment" })
    }
  })

  router.delete("/shipments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { ids } = req.body as { ids: number[] }
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ message: "ids array is required" })
      await db.delete(shipments).where(inArray(shipments.id, ids))
      res.json({ message: `${ids.length} shipment(s) deleted` })
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shipments" })
    }
  })

  // Add tracking event to a shipment
  router.post("/shipments/:id/events", isAuthenticated, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.id)
      const { status, location, latitude, longitude, message } = req.body

      if (!status || !location || !message) {
        return res.status(400).json({ message: "status, location, and message are required" })
      }

      const [event] = await db.insert(trackingEvents).values({
        shipmentId,
        status,
        location,
        latitude: latitude != null ? latitude.toString() : null,
        longitude: longitude != null ? longitude.toString() : null,
        message,
        createdBy: (req.user as any)?.id || null,
      }).returning()

      // Sync shipment status with latest event
      await db.update(shipments)
        .set({ status, updatedAt: new Date() })
        .where(eq(shipments.id, shipmentId))

      broadcastShipment(shipmentId)
      res.status(201).json(event)
    } catch (error) {
      res.status(500).json({ message: "Failed to add tracking event" })
    }
  })

  // --- Public tracking endpoint ---
  router.get("/track/:trackingNumber", async (req, res) => {
    try {
      const tn = req.params.trackingNumber.toUpperCase()
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.trackingNumber, tn),
        with: { trackingEvents: { orderBy: [desc(trackingEvents.timestamp)] } },
      })
      if (!shipment) return res.status(404).json({ message: "Shipment not found" })
      res.json(shipment)
    } catch (error) {
      res.status(500).json({ message: "Failed to track shipment" })
    }
  })

  // --- User-specific routes ---
  router.get("/user/dashboard", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id
      const [total] = await db.select({ count: count() }).from(shipments).where(eq(shipments.customerId, userId))
      const [active] = await db.select({ count: count() }).from(shipments).where(
        and(eq(shipments.customerId, userId), inArray(shipments.status, ["Pending_Collection", "In_Transit", "In_Warehouse", "Distribution", "On Route"]))
      )
      const [delivered] = await db.select({ count: count() }).from(shipments).where(
        and(eq(shipments.customerId, userId), eq(shipments.status, "Available"))
      )
      res.json({ total: Number(total.count), active: Number(active.count), delivered: Number(delivered.count) })
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" })
    }
  })

  router.get("/user/shipments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id
      const userShipments = await db.query.shipments.findMany({
        where: eq(shipments.customerId, userId),
        with: { trackingEvents: { orderBy: [desc(trackingEvents.timestamp)] } },
        orderBy: [desc(shipments.createdAt)],
      })
      res.json(userShipments)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipments" })
    }
  })

  // --- Users (admin only) ---
  router.get("/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" })

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          shipments: {
            orderBy: [desc(shipments.createdAt)],
            with: { trackingEvents: { orderBy: [desc(trackingEvents.timestamp)], limit: 1 } },
          },
        },
      })

      if (!user) return res.status(404).json({ message: "User not found" })

      const { passwordHash: _, ...safeUser } = user
      res.json(safeUser)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" })
    }
  })

  router.get("/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt))
      res.json(allUsers)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" })
    }
  })

  router.delete("/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" })
      const requesterId = (req.user as any)?.id
      if (requesterId === id)
        return res.status(400).json({ message: "You cannot delete your own account" })
      await db.delete(users).where(eq(users.id, id))
      res.json({ message: "User deleted" })
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" })
    }
  })

  router.delete("/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { ids } = req.body as { ids: number[] }
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ message: "ids array is required" })
      const requesterId = (req.user as any)?.id
      const safeIds = ids.filter((id) => id !== requesterId)
      if (safeIds.length === 0)
        return res.status(400).json({ message: "You cannot delete your own account" })
      await db.delete(users).where(inArray(users.id, safeIds))
      res.json({ message: `${safeIds.length} user(s) deleted` })
    } catch (error) {
      res.status(500).json({ message: "Failed to delete users" })
    }
  })

  // --- Settings ---
  router.get("/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(settings)
      const map = rows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>)
      res.json(map)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" })
    }
  })

  router.put("/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const updates = req.body as Record<string, string>
      for (const [key, value] of Object.entries(updates)) {
        await db.insert(settings)
          .values({ key, value })
          .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
      }
      res.json({ message: "Settings updated" })
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" })
    }
  })

  return router
}
