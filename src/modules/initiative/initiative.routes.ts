import express from 'express';
import { getInitiativeCourses, getInitiativeCourse, getInitiatives, getInitiative } from './initiative.controller.js';

const router = express.Router();

/**
 * Public routes for initiatives
 */
router.get('/', getInitiativeCourses);
router.get('/all', getInitiatives);
router.get('/all/:id', getInitiative);
router.get('/:id', getInitiativeCourse);

export default router;
