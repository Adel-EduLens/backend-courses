import express from 'express';
import { validatePromoCode } from './promoCode.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { validatePromoCodeSchema } from './promoCode.validation.js';

const router = express.Router();

router.post('/validate', validateRequest(validatePromoCodeSchema), validatePromoCode);

export default router;
