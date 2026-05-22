import { Request, Response, NextFunction } from 'express';
import { Payment } from './payment.model.js';
import { createPaymentSession, calculateAmountWithFees, verifyWebhookSignature, verifyRedirectSignature, getKashierOrderDetails } from '../../utils/kashier.service.js';
import mongoose from 'mongoose';
import Enrollment from '../course/enrollment.model.js';
import { PromoCode } from '../promoCode/promoCode.model.js';

const getFirstValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
};

const getKashierOrderId = (payload: Record<string, unknown>): string => {
  return getFirstValue(
    payload.merchantOrderId ||
    payload.orderId ||
    payload.merchant_order_id ||
    payload.order_id
  );
};

const getKashierTransactionId = (payload: Record<string, unknown>): string | undefined => {
  const transactionId = getFirstValue(payload.transactionId || payload.transaction_id || payload.orderReference);
  return transactionId || undefined;
};

const getKashierStatus = (payload: Record<string, unknown>): string => {
  return getFirstValue(payload.paymentStatus || payload.status || payload.transactionStatus).trim().toUpperCase();
};

const findNestedValue = (value: unknown, keys: string[]): unknown => {
  if (!value || typeof value !== 'object') return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedValue(item, keys);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }

  for (const child of Object.values(record)) {
    const found = findNestedValue(child, keys);
    if (found !== undefined) return found;
  }

  return undefined;
};

const findNestedValues = (value: unknown, keys: string[]): unknown[] => {
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value)) {
    return value.flatMap(item => findNestedValues(item, keys));
  }

  const record = value as Record<string, unknown>;
  const directValues = keys
    .filter(key => record[key] !== undefined)
    .map(key => record[key]);
  const childValues = Object.values(record).flatMap(child => findNestedValues(child, keys));

  return [...directValues, ...childValues];
};

const KASHIER_STATUS_KEYS = [
  'paymentStatus',
  'status',
  'transactionStatus',
  'orderStatus',
  'operation',
];

const getReconciledKashierStatuses = (payload: Record<string, unknown>): string[] => {
  return findNestedValues(payload, KASHIER_STATUS_KEYS)
    .map(status => getFirstValue(status).trim().toUpperCase())
    .filter(Boolean);
};

const getReconciledKashierStatus = (payload: Record<string, unknown>): string => {
  const status = findNestedValue(payload, KASHIER_STATUS_KEYS);

  return getFirstValue(status).trim().toUpperCase();
};

const hasSuccessfulReconciledStatus = (payload: Record<string, unknown>): boolean => {
  return getReconciledKashierStatuses(payload).some(isSuccessfulKashierStatus);
};

const hasFailedReconciledStatus = (payload: Record<string, unknown>): boolean => {
  const statuses = getReconciledKashierStatuses(payload);

  return statuses.length > 0 && statuses.every(status => isFailedKashierStatus(status));
};

const getKashierAmount = (payload: Record<string, unknown>): number | undefined => {
  const amount = findNestedValue(payload, [
    'amount',
    'capturedAmount',
    'paidAmount',
    'totalAmount',
  ]);
  const numericAmount = Number(getFirstValue(amount));

  return Number.isFinite(numericAmount) ? numericAmount : undefined;
};

const hasPaidAmount = (payload: Record<string, unknown>): boolean => {
  const amount = getKashierAmount(payload);

  return amount !== undefined && amount > 0;
};

const getBestReconciledKashierStatus = (payload: Record<string, unknown>): string => {
  if (hasSuccessfulReconciledStatus(payload)) return 'SUCCESS';
  if (hasPaidAmount(payload)) return 'PAID';
  if (hasFailedReconciledStatus(payload)) return 'FAILED';

  const status = findNestedValue(payload, [
    'paymentStatus',
    'status',
    'transactionStatus',
    'orderStatus',
    'operation',
  ]);

  return getFirstValue(status).trim().toUpperCase();
};

const isSuccessfulKashierStatus = (status: string): boolean => {
  return ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'CAPTURED', 'APPROVED'].includes(status);
};

const isFailedKashierStatus = (status: string): boolean => {
  return ['FAILED', 'FAIL', 'DECLINED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'VOIDED'].includes(status);
};

const finalizeSuccessfulPayment = async (
  merchantOrderId: string,
  transactionId: string | undefined,
  kashierResponse: Record<string, unknown>
) => {
  const payment = await Payment.findOne({ orderId: merchantOrderId });

  if (!payment) return null;

  const wasAlreadySuccessful = payment.status === 'success';
  payment.status = 'success';
  if (transactionId) {
    payment.transactionId = transactionId;
  }
  payment.paymentDetails = {
    ...(payment.paymentDetails || {}),
    kashierResponse
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
      referenceModel: payment.referenceModel,
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

    console.log('[Kashier] Enrollment upserted:', result._id);

    if (!wasAlreadySuccessful && payment.paymentDetails?.promoCode) {
      await PromoCode.findOneAndUpdate(
        { code: payment.paymentDetails.promoCode, $expr: { $lt: ['$currentUses', '$maxUses'] } },
        { $inc: { currentUses: 1 } }
      );
    }
  } catch (enrollError: any) {
    console.error('[Kashier] Enrollment creation failed:', enrollError.message);
  }

  return payment;
};

const finalizeFailedPayment = async (
  merchantOrderId: string,
  kashierResponse: Record<string, unknown>
) => {
  const payment = await Payment.findOne({ orderId: merchantOrderId });

  if (!payment || payment.status === 'success') return payment;

  payment.status = 'failed';
  payment.paymentDetails = {
    ...(payment.paymentDetails || {}),
    kashierResponse
  };
  await payment.save();

  return payment;
};

const reconcileKashierPayment = async (merchantOrderId: string) => {
  const orderDetails = await getKashierOrderDetails(merchantOrderId);

  if (!orderDetails) return null;

  const status = getBestReconciledKashierStatus(orderDetails as Record<string, unknown>);
  const transactionId = getKashierTransactionId(orderDetails as Record<string, unknown>);

  if (isSuccessfulKashierStatus(status)) {
    return finalizeSuccessfulPayment(merchantOrderId, transactionId, orderDetails as Record<string, unknown>);
  }

  if (isFailedKashierStatus(status)) {
    return finalizeFailedPayment(merchantOrderId, orderDetails as Record<string, unknown>);
  }

  console.warn('[Kashier] Reconciliation returned unknown status:', status || 'empty', 'for order:', merchantOrderId);
  return Payment.findOne({ orderId: merchantOrderId });
};

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
    console.log('[Kashier Webhook] Received:', {
      method: req.method,
      path: req.originalUrl,
      signature: req.headers['x-kashier-signature'] ? 'present' : 'missing',
      contentType: req.headers['content-type'],
      body: req.body,
    });

    const signature = req.headers['x-kashier-signature'] as string;

    if (process.env.KASHIER_MODE !== 'test' && !verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const data = (req.body.data || req.body) as Record<string, unknown>;
    const merchantOrderId = getKashierOrderId(data);
    const transactionId = getKashierTransactionId(data);
    const status = getKashierStatus(data);


    if (isSuccessfulKashierStatus(status)) {
      await finalizeSuccessfulPayment(merchantOrderId, transactionId, data);
    } else if (isFailedKashierStatus(status)) {
      await finalizeFailedPayment(merchantOrderId, data);
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
    const query = req.query as Record<string, unknown>;
    const merchantOrderId = getKashierOrderId(query);
    const transactionId = getKashierTransactionId(query);
    const paymentStatus = getKashierStatus(query);

    console.log('[Kashier Redirect] Received:', {
      method: req.method,
      path: req.originalUrl,
      merchantOrderId,
      paymentStatus: paymentStatus || 'missing',
      query,
    });

    if (query.signature && !verifyRedirectSignature(query)) {
      console.warn('[Kashier] Redirect signature did not match for order:', merchantOrderId);
    }

    if (isSuccessfulKashierStatus(paymentStatus)) {
      await finalizeSuccessfulPayment(merchantOrderId, transactionId, query);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=success&orderId=${merchantOrderId}`);
    }

    if (merchantOrderId) {
      if (isFailedKashierStatus(paymentStatus)) {
        const payment = await reconcileKashierPayment(merchantOrderId);

        if (payment?.status === 'success') {
          return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=success&orderId=${merchantOrderId}`);
        }

        if (payment?.status === 'failed') {
          return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=failed&orderId=${merchantOrderId}`);
        }

        return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=pending&orderId=${merchantOrderId}`);
      }

      const payment = await Payment.findOne({ orderId: merchantOrderId });

      if (payment?.status === 'success') {
        return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=success&orderId=${merchantOrderId}`);
      }

      if (payment?.status === 'pending') {
        return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=pending&orderId=${merchantOrderId}`);
      }

      return res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=pending&orderId=${merchantOrderId}`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment-status?status=pending`);
  } catch (error) {
    next(error);
  }
};
