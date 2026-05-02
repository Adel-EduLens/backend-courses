import express from 'express';
import { getCourses, getCourse, enrollInRound } from './course.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { enrollRoundSchema } from './course.validation.js';

const router = express.Router();

/**
 * Public routes
 */
router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/enroll', validateRequest(enrollRoundSchema), enrollInRound);

export default router;
