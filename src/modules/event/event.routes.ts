import express from 'express';
import { getEvents, getEvent, getPastEvents, getUpcomingEvents } from './event.controller.js';

const router = express.Router();

/**
 * Public routes for events
 */
router.get('/', getEvents);
router.get('/past', getPastEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/:id', getEvent);

export default router;
