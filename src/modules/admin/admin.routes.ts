import express from 'express';
import { login, getMe } from './controllers/admin.auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { loginSchema } from './admin.validation.js';

const router = express.Router();

router.post('/login', validateRequest(loginSchema), login);

// All routes after this middleware are protected
router.use(protect);

router.get('/me', getMe);

export default router;
