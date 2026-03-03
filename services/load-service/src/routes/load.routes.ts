import { Router } from 'express';
import { loadController } from '../controllers/load.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLoadSchema, updateLoadSchema, filterLoadSchema } from '../schemas/load.schema';

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
  authenticate,
  loadController.getLoadById
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
