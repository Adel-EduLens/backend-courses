import express from 'express';
import { getCourses, getCourse, enrollInRound } from './course.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { enrollRoundSchema } from './course.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Public routes
 */
router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/enroll', protect, restrictTo('student'), validateRequest(enrollRoundSchema), enrollInRound);

export default router;
