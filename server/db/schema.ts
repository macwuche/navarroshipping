import { pgTable, serial, text, timestamp, integer, decimal, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum('role', ['admin', 'staff', 'customer']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('customer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Shipments table
export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  trackingNumber: text('tracking_number').notNull().unique(),
  senderName: text('sender_name').notNull(),
  senderAddress: text('sender_address').notNull(),
  senderPhone: text('sender_phone'),
  senderEmail: text('sender_email'),
  receiverName: text('receiver_name').notNull(),
  receiverAddress: text('receiver_address').notNull(),
  receiverPhone: text('receiver_phone'),
  receiverEmail: text('receiver_email'),
  weight: decimal('weight').notNull(),
  weightUnit: text('weight_unit').notNull().default('kg'),
  dimensions: jsonb('dimensions'), // { length, width, height, unit }
  description: text('description'),
  status: text('status').notNull().default('Pending_Collection'),
  destinationLatitude: text('destination_latitude'),
  destinationLongitude: text('destination_longitude'),
  estimatedDelivery: timestamp('estimated_delivery'),
  actualDelivery: timestamp('actual_delivery'),
  customerId: integer('customer_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tracking events table - the journey timeline
export const trackingEvents = pgTable('tracking_events', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  location: text('location').notNull(),
  latitude: decimal('latitude'),
  longitude: decimal('longitude'),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

// Settings table - for admin configuration
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  shipments: many(shipments),
  trackingEvents: many(trackingEvents),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  customer: one(users, {
    fields: [shipments.customerId],
    references: [users.id],
  }),
  trackingEvents: many(trackingEvents),
}));

export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  shipment: one(shipments, {
    fields: [trackingEvents.shipmentId],
    references: [shipments.id],
  }),
  creator: one(users, {
    fields: [trackingEvents.createdBy],
    references: [users.id],
  }),
}));
