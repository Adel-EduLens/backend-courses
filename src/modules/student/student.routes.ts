import express from 'express';
import { register, verifyRegisterOtp, resendRegisterOtp, login, getMe, getMyEnrollments } from './student.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { registerSchema, verifyOtpSchema, otpRequestSchema, loginSchema } from './student.validation.js';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/register/verify', validateRequest(verifyOtpSchema), verifyRegisterOtp);
router.post('/register/resend', validateRequest(otpRequestSchema), resendRegisterOtp);
router.post('/login', validateRequest(loginSchema), login);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.get('/my-enrollments', getMyEnrollments);

export default router;
