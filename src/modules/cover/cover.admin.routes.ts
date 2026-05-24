import express, { type NextFunction, type Request, type Response } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { multerMiddleware, validateRequest } from '../../middlewares/middleware.js';
import { getCovers, getSelectableItems, createCover, updateCover, deleteCover, updateCoverStats } from './cover.controller.js';
import { createCoverSchema, updateCoverSchema, updateCoverStatsSchema } from './cover.validation.js';

const router = express.Router();

const coverUpload = multerMiddleware({
  getPath: () => ['cover']
});

const normalizeStatsPayload = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body.stats === 'string') {
    try {
      req.body.stats = JSON.parse(req.body.stats);
    } catch (error) {
      // Leave invalid JSON untouched so Joi can report it.
    }
  }
  next();
};

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getCovers);
router.get('/items', getSelectableItems);

router.put(
  '/stats',
  normalizeStatsPayload,
  validateRequest(updateCoverStatsSchema),
  updateCoverStats
);

router.post(
  '/',
  ...coverUpload.single('backgroundImage'),
  validateRequest(createCoverSchema),
  createCover
);

router.put(
  '/:id',
  ...coverUpload.single('backgroundImage'),
  validateRequest(updateCoverSchema),
  updateCover
);

router.delete('/:id', deleteCover);

export default router;
