import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { carrierController } from '../controllers/carrier.controller';
import { shipperController } from '../controllers/shipper.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

export const carrierProfileSchema = z.object({
  truckType: z.enum(['flatbed', 'refrigerated', 'dry-van', 'tanker'], {
    errorMap: () => ({ message: 'Truck type must be flatbed, refrigerated, dry-van, or tanker' }),
  }),
  capacityKg: z
    .number({ invalid_type_error: 'Capacity must be a number' })
    .positive('Capacity must be a positive number'),
  homeCity: z
    .string()
    .min(1, 'Home city is required')
    .trim(),
  profilePhotoUrl: z.string().nullable().optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').nullable().optional(),
});

export const shipperProfileSchema = z.object({
  companyName: z.string().max(200, 'Company name must be 200 characters or less').nullable().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').nullable().optional(),
});

const router = Router();

router.patch(
  '/carrier-profile',
  authenticate,
  authorize('Carrier'),
  validate(carrierProfileSchema),
  carrierController.updateProfile,
);

router.patch(
  '/shipper-profile',
  authenticate,
  authorize('Shipper'),
  validate(shipperProfileSchema),
  shipperController.updateProfile,
);

router.get('/profile', authenticate, userController.getProfile);

router.get('/:id', authenticate, userController.getById);

export default router;

