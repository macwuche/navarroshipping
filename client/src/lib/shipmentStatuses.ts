export const STATUS_LABELS: Record<string, string> = {
  Pending_Collection: "Pending Collection",
  "Received Office": "Received Office",
  In_Transit: "In Transit",
  In_Warehouse: "In Warehouse",
  Distribution: "Distribution",
  Available: "Available",
  "On Route": "On Route",
  Approved: "Approved",
  Pick_up: "Pick Up",
  Quotation: "Quotation",
  Pending_quote: "Pending Quote",
  Invoiced: "Invoiced",
  Cancelled: "Cancelled",
  Pending_payment: "Pending Payment",
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}
