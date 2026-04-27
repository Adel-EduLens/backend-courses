import express from 'express';
import { createEvent, updateEvent, deleteEvent } from './event.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createEventSchema, updateEventSchema } from './event.validation.js';

const router = express.Router();

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', validateRequest(createEventSchema), createEvent);
router.patch('/:id', validateRequest(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);

export default router;
