import express from 'express';
import { getInitiativeCourses, getInitiativeCourse, getInitiatives, getInitiative, enrollInInitiativeCourse } from './initiative.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { enrollInitiativeCourseSchema } from './initiative.validation.js';

const router = express.Router();

/**
 * Public routes for initiatives
 */
router.get('/', getInitiativeCourses);
router.get('/all', getInitiatives);
router.get('/all/:id', getInitiative);
router.post('/enroll', validateRequest(enrollInitiativeCourseSchema), enrollInInitiativeCourse);
router.get('/:id', getInitiativeCourse);

export default router;
