import express from 'express';
import { getEvents, getEvent, getPastEvents, getUpcomingEvents, reserveEvent } from './event.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { reserveEventSchema } from './event.validation.js';

const router = express.Router();

/**
 * Public routes for events
 */
router.get('/', getEvents);
router.get('/past', getPastEvents);
router.get('/upcoming', getUpcomingEvents);
router.post('/reserve', protect, restrictTo('student'), validateRequest(reserveEventSchema), reserveEvent);
router.get('/:id', getEvent);

export default router;
