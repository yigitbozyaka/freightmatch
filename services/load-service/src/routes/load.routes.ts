import { Router } from 'express';
import { loadController } from '../controllers/load.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLoadSchema, updateLoadSchema, filterLoadSchema } from '../schemas/load.schema';

const router = Router();

// Carrier: Browse available loads
router.get(
  '/available',
  authenticate,
  authorize('Carrier'),
  validate(filterLoadSchema),
  loadController.getAvailableLoads
);

// Shipper: Get their own loads
router.get(
  '/my-loads',
  authenticate,
  authorize('Shipper'),
  loadController.getMyLoads
);

// Shipper: Create a new load
router.post(
  '/',
  authenticate,
  authorize('Shipper'),
  validate(createLoadSchema),
  loadController.createLoad
);

// Any authenticated: Get load by ID
router.get(
  '/:id',
  authenticate,
  loadController.getLoadById
);

// Shipper: Update draft load
router.patch(
  '/:id',
  authenticate,
  authorize('Shipper'),
  validate(updateLoadSchema),
  loadController.updateLoad
);

// Shipper: Delete draft load
router.delete(
  '/:id',
  authenticate,
  authorize('Shipper'),
  loadController.deleteLoad
);

export const loadRouter: Router = router;
