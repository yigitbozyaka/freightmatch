import { z } from 'zod';

export const createBidSchema = z.object({
  body: z.object({
    loadId: z.string().min(1, 'Load ID is required'),
    priceUSD: z.number().positive('Price must be positive'),
    estimatedDeliveryHours: z.number().positive('Estimated delivery hours must be positive'),
  }),
});
