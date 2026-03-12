import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { carrierController } from '../controllers/carrier.controller';
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
});

const router = Router();

router.patch(
  '/carrier-profile',
  authenticate,
  authorize('Carrier'),
  validate(carrierProfileSchema),
  carrierController.updateProfile,
);

router.get('/profile', authenticate, userController.getProfile);

router.get('/:id', authenticate, userController.getById);

export default router;

