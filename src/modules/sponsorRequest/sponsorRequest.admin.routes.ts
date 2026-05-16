import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { getSponsorRequests } from './sponsorRequest.controller.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getSponsorRequests);

export default router;
