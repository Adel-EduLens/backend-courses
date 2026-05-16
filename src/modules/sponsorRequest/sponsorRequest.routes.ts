import express from 'express';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createSponsorRequest } from './sponsorRequest.controller.js';
import { createSponsorRequestSchema } from './sponsorRequest.validation.js';

const router = express.Router();

router.post('/', validateRequest(createSponsorRequestSchema), createSponsorRequest);

export default router;
