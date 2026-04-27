import express from 'express';
import { createInitiativeCourse, updateInitiativeCourse, deleteInitiativeCourse, createInitiative } from './initiative.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createInitiativeCourseSchema, updateInitiativeCourseSchema, createInitiativeSchema } from './initiative.validation.js';

const router = express.Router();

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.post('/all', validateRequest(createInitiativeSchema), createInitiative);
router.post('/', validateRequest(createInitiativeCourseSchema), createInitiativeCourse);
router.patch('/:id', validateRequest(updateInitiativeCourseSchema), updateInitiativeCourse);
router.delete('/:id', deleteInitiativeCourse);

export default router;
