import { Request, Response, NextFunction } from 'express';
import { Payment } from './payment.model.js';
import { createPaymentSession, calculateAmountWithFees, verifyWebhookSignature, verifyTransactionStatus } from '../../utils/kashier.service.js';
import mongoose from 'mongoose';
import Enrollment from '../course/enrollment.model.js';
import { PromoCode } from '../promoCode/promoCode.model.js';

/**
 * @desc    Initiate a payment session
 * @route   POST /api/payments/initiate
 * @access  Private (should be)
 */
export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { referenceId, referenceModel, amount, customer } = req.body;

    if (!referenceId || !referenceModel || !amount || !customer || !customer.name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // 1. Calculate final amount with Kashier fees
    const amountWithFees = calculateAmountWithFees(amount);

    // 2. Generate unique order ID
    const timestamp = Date.now();
    const orderId = `${referenceModel}_${referenceId}_${timestamp}`;

    // 3. Create pending payment record
    const payment = await Payment.create({
      orderId,
      referenceId,
      referenceModel,
      amount, // Store base amount
      status: 'pending',
      customer
    });

    // 4. Create Kashier session
    const sessionResponse = await createPaymentSession({
      amount: amountWithFees,
      merchantOrderId: orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone
    });

    if (!sessionResponse || !sessionResponse.sessionUrl) {
      throw new Error('Kashier failed to generate a session URL');
    }

    res.status(200).json({
      success: true,
      data: {
        payment,
        amountWithFees,
        sessionUrl: sessionResponse.sessionUrl,
        kashier: {
          merchantId: process.env.KASHIER_MERCHANT_ID,
          mode: process.env.KASHIER_MODE
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Kashier Webhook Handler — updates payment status and creates enrollment
 * @route   POST /api/payments/kashier/webhook
 * @access  Public
 */
export const handleKashierWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-kashier-signature'] as string;

    if (process.env.KASHIER_MODE !== 'test' && !verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { data } = req.body;
    const merchantOrderId = data.merchantOrderId as string;
    const transactionId = data.transactionId as string;
    const status = data.status as string;


    if (status === 'SUCCESS') {
      const payment = await Payment.findOne({ orderId: merchantOrderId });

      if (payment) {
        payment.status = 'success';
        payment.transactionId = transactionId;
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          kashierResponse: data
        };
        await payment.save();

        const name = payment.customer?.name ?? '';
        const email = payment.customer?.email ?? '';
        const phone = payment.customer?.phone ?? '';
        const studentId = payment.paymentDetails?.studentId;
        const additionalInfo = payment.paymentDetails?.additionalInfo;

        try {
          const enrollmentFilter: Record<string, unknown> = {
            referenceId: payment.referenceId,
            studentId,
          };

          if (payment.referenceModel === 'Initiative') {
            enrollmentFilter.enrollmentTarget = payment.paymentDetails?.enrollmentTarget;
            enrollmentFilter.initiativePackageId = payment.paymentDetails?.initiativePackageId;
          }

          const enrollmentUpdate = {
            $set: {
              referenceModel: payment.referenceModel,
              selectedCourses: payment.paymentDetails?.selectedCourses,
              studentId,
              fullName: name,
              email,
              phone,
              additionalInfo,
              paymentOrderId: merchantOrderId,
              promoCode: payment.paymentDetails?.promoCode
            }
          };

          const result = await Enrollment.findOneAndUpdate(
            enrollmentFilter,
            enrollmentUpdate,
            { upsert: true, returnDocument: 'after', runValidators: true }
          );

          console.log('[Webhook] Enrollment upserted:', result._id);

          // Increment promo code usage on successful enrollment
          if (payment.paymentDetails?.promoCode) {
            await PromoCode.findOneAndUpdate(
              { code: payment.paymentDetails.promoCode, $expr: { $lt: ['$currentUses', '$maxUses'] } },
              { $inc: { currentUses: 1 } }
            );
          }
        } catch (enrollError: any) {
          console.error('[Webhook] Enrollment creation failed:', enrollError.message);
        }
      }
    } else if (status === 'FAILED') {
      const payment = await Payment.findOne({ orderId: merchantOrderId });
      if (payment) {
        payment.status = 'failed';
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          kashierResponse: data
        };
        await payment.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Kashier Success Redirect Handler
 * @route   GET /api/payments/kashier/success
 * @access  Public
 */
export const handlePaymentSuccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantOrderId = req.query['merchantOrderId'] as string;
    const transactionId = req.query['transactionId'] as string;
    const paymentStatus = req.query['paymentStatus'] as string;

    if (paymentStatus === 'SUCCESS') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=success&orderId=${merchantOrderId}`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=failed&orderId=${merchantOrderId}`);
  } catch (error) {
    next(error);
  }
};
