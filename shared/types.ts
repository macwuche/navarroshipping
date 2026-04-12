// Shared types between frontend and backend

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'customer';
  createdAt: Date;
  updatedAt: Date;
}

export interface Shipment {
  id: number;
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  senderPhone?: string;
  senderEmail?: string;
  receiverName: string;
  receiverAddress: string;
  receiverPhone?: string;
  receiverEmail?: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  description?: string;
  status: ShipmentStatus;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ShipmentStatus =
  | 'Pending_Collection'
  | 'Received Office'
  | 'In_Transit'
  | 'In_Warehouse'
  | 'Distribution'
  | 'Available'
  | 'On Route'
  | 'Approved'
  | 'Pick_up'
  | 'Quotation'
  | 'Pending_quote'
  | 'Invoiced'
  | 'Cancelled'
  | 'Pending_payment'
  | string;

export interface TrackingEvent {
  id: number;
  shipmentId: number;
  status: ShipmentStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  message: string;
  timestamp: Date;
  createdBy?: number;
}

export interface TrackingUpdate {
  status: ShipmentStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  message: string;
}

export interface DashboardStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  pending: number;
  exceptions: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
