import { Router } from 'express';
import { carrierController } from '../controllers/carrier.controller';
import { internalAuth } from '../middlewares/internal.middleware';

const router = Router();

router.get('/', internalAuth, carrierController.getAll);
router.get('/:id', internalAuth, carrierController.getById);

export default router;
