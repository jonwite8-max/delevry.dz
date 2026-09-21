import type { ShipmentStatus } from "./shipment-status";

const transitions: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  NEW: ["PROCESSING", "CANCELLED", "ISSUE"],
  PROCESSING: ["RECEIVED", "IN_TRANSIT", "CANCELLED", "ISSUE"],
  RECEIVED: ["IN_TRANSIT", "CANCELLED", "ISSUE"],
  IN_TRANSIT: ["ARRIVED", "RETURNED", "ISSUE"],
  ARRIVED: ["READY_FOR_PICKUP", "RETURNED", "ISSUE"],
  READY_FOR_PICKUP: ["DELIVERED", "RETURNED", "ISSUE"],
  DELIVERED: ["ISSUE"],
  CANCELLED: [],
  RETURNED: [],
  ISSUE: ["PROCESSING", "IN_TRANSIT", "CANCELLED", "RETURNED"],
};

export function canTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  return transitions[from].includes(to);
}

export function allowedTransitions(
  from: ShipmentStatus,
): readonly ShipmentStatus[] {
  return transitions[from];
}
