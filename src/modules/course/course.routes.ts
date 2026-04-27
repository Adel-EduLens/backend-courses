import express from 'express';
import { getCourses, getCourse, enrollInCourse } from './course.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { enrollCourseSchema } from './course.validation.js';

const router = express.Router();

/**
 * Public routes
 */
router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/enroll', validateRequest(enrollCourseSchema), enrollInCourse);

export default router;
