import { z } from 'zod';

export const createLoadSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    origin: z.string().min(1, 'Origin is required'),
    destination: z.string().min(1, 'Destination is required'),
    cargoType: z.string().min(1, 'Cargo type is required'),
    weightKg: z.number().positive('Weight must be positive'),
    deadlineHours: z.number().positive('Deadline must be positive'),
  }),
});

export const updateLoadSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    origin: z.string().min(1, 'Origin is required').optional(),
    destination: z.string().min(1, 'Destination is required').optional(),
    cargoType: z.string().min(1, 'Cargo type is required').optional(),
    weightKg: z.number().positive('Weight must be positive').optional(),
    deadlineHours: z.number().positive('Deadline must be positive').optional(),
  }).strict(),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Draft', 'Posted', 'Matched', 'InTransit', 'Delivered', 'Cancelled']),
  }),
});

export const filterLoadSchema = z.object({
  query: z.object({
    origin: z.string().optional(),
    destination: z.string().optional(),
    cargoType: z.string().optional(),
  }),
});
