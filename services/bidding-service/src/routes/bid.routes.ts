import { Router } from 'express';
import { bidController } from '../controllers/bid.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createBidSchema } from '../schemas/bid.schema';

const router = Router();

router.get(
  '/my',
  authenticate,
  authorize('Carrier'),
  bidController.getMyBids
);

router.post(
  '/',
  authenticate,
  authorize('Carrier'),
  validate(createBidSchema),
  bidController.createBid
);

router.get(
  '/:loadId',
  authenticate,
  authorize('Shipper'),
  bidController.getBidsByLoad
);

router.patch(
  '/:bidId/accept',
  authenticate,
  authorize('Shipper'),
  bidController.acceptBid
);

export const bidRouter: Router = router;
