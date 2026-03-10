import { Router } from 'express';
import { loadController } from '../controllers/load.controller';
import { authenticate, authorize, authenticateOrInternal } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLoadSchema, updateLoadSchema, updateStatusSchema, filterLoadSchema } from '../schemas/load.schema';

const router = Router();

router.get(
  '/available',
  authenticate,
  authorize('Carrier'),
  validate(filterLoadSchema),
  loadController.getAvailableLoads
);

router.get(
  '/my-loads',
  authenticate,
  authorize('Shipper'),
  loadController.getMyLoads
);

router.post(
  '/',
  authenticate,
  authorize('Shipper'),
  validate(createLoadSchema),
  loadController.createLoad
);

router.get(
  '/:id',
  authenticateOrInternal,
  loadController.getLoadById
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('Shipper'),
  validate(updateStatusSchema),
  loadController.updateStatus
);

router.patch(
  '/:id',
  authenticate,
  authorize('Shipper'),
  validate(updateLoadSchema),
  loadController.updateLoad
);

router.delete(
  '/:id',
  authenticate,
  authorize('Shipper'),
  loadController.deleteLoad
);

export const loadRouter: Router = router;
