import { Router } from "express"
import { eq, desc, count, and, inArray } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "../db/schema"
import { shipments, trackingEvents, settings } from "../db/schema"
import { isAuthenticated, isAdmin } from "../middleware"

export function createRouter(db: NodePgDatabase<typeof schema>) {
  const router = Router()

  // --- Dashboard ---
  router.get("/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const [total] = await db.select({ count: count() }).from(shipments)
      const [inTransit] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "in-transit"))
      const [delivered] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "delivered"))
      const [pending] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "pending"))
      const [exceptions] = await db.select({ count: count() }).from(shipments).where(eq(shipments.status, "exception"))
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
        status: "pending",
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

  router.put("/shipments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" })

      const allowed = ["status", "estimatedDelivery", "actualDelivery", "description"]
      const updates: Record<string, any> = { updatedAt: new Date() }
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key]
      }

      const [updated] = await db.update(shipments).set(updates).where(eq(shipments.id, id)).returning()
      if (!updated) return res.status(404).json({ message: "Shipment not found" })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ message: "Failed to update shipment" })
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
        and(eq(shipments.customerId, userId), inArray(shipments.status, ["pending", "in-transit", "out-for-delivery"]))
      )
      const [delivered] = await db.select({ count: count() }).from(shipments).where(
        and(eq(shipments.customerId, userId), eq(shipments.status, "delivered"))
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
