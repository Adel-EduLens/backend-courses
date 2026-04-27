import express from 'express';
import { initiatePayment, handleKashierWebhook, handlePaymentSuccess } from './payment.controller.js';

const router = express.Router();

router.post('/initiate', initiatePayment);
router.post('/kashier/webhook', handleKashierWebhook);
router.get('/kashier/success', handlePaymentSuccess);

export default router;
