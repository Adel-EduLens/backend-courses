import express from 'express';
import { createCourse, updateCourse, deleteCourse, getEnrollments } from './course.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createCourseSchema } from './course.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', validateRequest(createCourseSchema), createCourse);
router.get('/enrollments', getEnrollments);
router.patch('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
