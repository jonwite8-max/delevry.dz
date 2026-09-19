import { z } from "zod";

export const createShipmentSchema = z.object({
  senderName: z.string().trim().min(2).max(160),
  senderPhone: z.string().trim().max(32).optional(),
  recipientName: z.string().trim().min(2).max(160),
  recipientPhone: z.string().trim().max(32).optional(),
  originWilaya: z.string().trim().min(2).max(120),
  originCommune: z.string().trim().max(120).optional(),
  destinationWilaya: z.string().trim().min(2).max(120),
  destinationCommune: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).default(""),
  quantity: z.coerce.number().int().min(1).max(100000).default(1),
  weight: z.coerce.number().nonnegative().max(100000).optional(),
  volume: z.coerce.number().nonnegative().max(100000).optional(),
  deliveryFee: z.coerce.number().nonnegative().max(100000000).default(0),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
