import express from 'express';
import { createInitiativeCourse, updateInitiativeCourse, deleteInitiativeCourse, createInitiative, updateInitiative, deleteInitiative } from './initiative.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createInitiativeCourseSchema, updateInitiativeCourseSchema, createInitiativeSchema, updateInitiativeSchema } from './initiative.validation.js';

const router = express.Router();

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.post('/all', validateRequest(createInitiativeSchema), createInitiative);
router.patch('/all/:id', validateRequest(updateInitiativeSchema), updateInitiative);
router.delete('/all/:id', deleteInitiative);
router.post('/', validateRequest(createInitiativeCourseSchema), createInitiativeCourse);
router.patch('/:id', validateRequest(updateInitiativeCourseSchema), updateInitiativeCourse);
router.delete('/:id', deleteInitiativeCourse);

export default router;
