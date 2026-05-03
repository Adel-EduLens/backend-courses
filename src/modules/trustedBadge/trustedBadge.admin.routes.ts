import express, { type NextFunction, type Request, type Response } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { multerMiddleware, validateRequest } from '../../middlewares/middleware.js';
import { getTrustedBadgeContent, updateTrustedBadgeContent } from './trustedBadge.controller.js';
import { updateTrustedBadgeContentSchema } from './trustedBadge.validation.js';

const router = express.Router();

const trustedBadgeUpload = multerMiddleware({
  getPath: () => ['trusted-badges']
});

const normalizeTrustedBadgePayload = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body.badges === 'string') {
    try {
      req.body.badges = JSON.parse(req.body.badges);
    } catch (error) {
      // Leave invalid JSON untouched so Joi can report it.
    }
  }

  next();
};

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getTrustedBadgeContent);
router.put(
  '/',
  trustedBadgeUpload.any(),
  normalizeTrustedBadgePayload,
  validateRequest(updateTrustedBadgeContentSchema),
  updateTrustedBadgeContent
);

export default router;
