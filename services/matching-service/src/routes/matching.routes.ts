import { Router } from 'express';
import { matchingController } from '../controllers/matching.controller';

const router = Router();

router.get('/:loadId', matchingController.getByLoadId);

router.post('/recommend', matchingController.manualRecommend);

export const matchingRouter: Router = router;
