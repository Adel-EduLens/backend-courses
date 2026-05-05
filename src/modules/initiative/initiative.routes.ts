import express from 'express';
import { getInitiativeCourses, getInitiativeCourse, getInitiatives, getInitiative, enrollInInitiative } from './initiative.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { enrollInitiativeSchema } from './initiative.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Public routes for initiatives
 */
router.get('/', getInitiativeCourses);
router.get('/all', getInitiatives);
router.get('/all/:id', getInitiative);
router.post('/enroll', protect, restrictTo('student'), validateRequest(enrollInitiativeSchema), enrollInInitiative);
router.get('/:id', getInitiativeCourse);

export default router;
