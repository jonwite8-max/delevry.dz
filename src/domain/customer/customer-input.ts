import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  phone: z.string().trim().min(3).max(30),
  additionalPhone: z.string().trim().max(30).optional(),
  wilaya: z.string().trim().max(80).optional(),
  commune: z.string().trim().max(120).optional(),
  niche: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;
