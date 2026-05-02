import express, { type NextFunction, type Request, type Response } from 'express';
import { createEvent, updateEvent, deleteEvent } from './event.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createEventSchema, updateEventSchema } from './event.validation.js';
import { multerMiddleware } from '../../middlewares/middleware.js';

const router = express.Router();
const eventGalleryUpload = multerMiddleware({
  getPath: (req) => {
    if (typeof req.params.id === 'string' && req.params.id.length > 0) {
      return ['events', req.params.id, 'gallery'];
    }

    return ['events', 'gallery'];
  }
});

const normalizeEventPayload = (req: Request, res: Response, next: NextFunction) => {
  const jsonFields = ['speakers', 'activities', 'partners', 'keyObjectives', 'eventGallery'] as const;

  for (const field of jsonFields) {
    if (typeof req.body[field] !== 'string') continue;

    try {
      req.body[field] = JSON.parse(req.body[field]);
    } catch (error) {
      // Leave invalid JSON untouched so Joi can return a validation error.
    }
  }

  if (typeof req.body.existingGallery === 'string') {
    try {
      req.body.eventGallery = JSON.parse(req.body.existingGallery);
    } catch (error) {
      req.body.eventGallery = req.body.existingGallery;
    }
  }

  delete req.body.existingGallery;
  next();
};

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', eventGalleryUpload.any(), normalizeEventPayload, validateRequest(createEventSchema), createEvent);
router.patch('/:id', eventGalleryUpload.any(), normalizeEventPayload, validateRequest(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);

export default router;
