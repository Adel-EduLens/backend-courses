import express from 'express';
import { getPromoCodes, getPromoCode, createPromoCode, updatePromoCode, deletePromoCode } from './promoCode.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createPromoCodeSchema, updatePromoCodeSchema } from './promoCode.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getPromoCodes);
router.get('/:id', getPromoCode);
router.post('/', validateRequest(createPromoCodeSchema), createPromoCode);
router.patch('/:id', validateRequest(updatePromoCodeSchema), updatePromoCode);
router.delete('/:id', deletePromoCode);

export default router;
