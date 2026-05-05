import express from 'express';
import {
  register,
  verifyRegisterOtp,
  resendRegisterOtp,
  login,
  forgotPassword,
  resendForgotPasswordOtp,
  resetPassword,
  getMe,
  getMyEnrollments
} from './student.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
  registerSchema,
  verifyOtpSchema,
  otpRequestSchema,
  loginSchema,
  resetPasswordSchema
} from './student.validation.js';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/register/verify', validateRequest(verifyOtpSchema), verifyRegisterOtp);
router.post('/register/resend', validateRequest(otpRequestSchema), resendRegisterOtp);
router.post('/login', validateRequest(loginSchema), login);
router.post('/forgot-password', validateRequest(otpRequestSchema), forgotPassword);
router.post('/forgot-password/resend', validateRequest(otpRequestSchema), resendForgotPasswordOtp);
router.post('/forgot-password/reset', validateRequest(resetPasswordSchema), resetPassword);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.get('/my-enrollments', getMyEnrollments);

export default router;
