import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });

const KASHIER_CONFIG = {
  merchantId: process.env.KASHIER_MERCHANT_ID,
  apiKey: process.env.KASHIER_API_KEY,
  secretKey: process.env.KASHIER_SECRET_KEY,
  mode: process.env.KASHIER_MODE || 'test',
  baseUrl: process.env.KASHIER_MODE === 'live' ? 'https://api.kashier.io' : 'https://test-api.kashier.io',
};

/**
 * Calculates the final amount including Kashier fees (1.5% + 2 EGP)
 * Formula: (baseAmount + 2) / (1 - 0.015)
 */
export const calculateAmountWithFees = (baseAmount: number): number => {
  const finalAmount = (baseAmount + 2) / (1 - 0.015);
  return Math.round(finalAmount * 100) / 100; // Round to 2 decimal places
};

/**
 * Creates a payment session with Kashier V3 API
 */
export const createPaymentSession = async (orderData: {
  amount: number;
  merchantOrderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) => {
  const { merchantId, secretKey, apiKey, baseUrl } = KASHIER_CONFIG;

  const payload = {
    merchantId,
    amount: String(orderData.amount),
    currency: 'EGP',
    merchantOrderId: orderData.merchantOrderId,
    customer: {
      reference: orderData.merchantOrderId,
      name: orderData.customerName,
      email: orderData.customerEmail || 'customer@example.com',
      phone: orderData.customerPhone || '01000000000'
    },
    serverWebhook: `${process.env.BASE_URL}/api/payments/kashier/webhook`,
    merchantRedirect: `${process.env.BASE_URL}/api/payments/kashier/success`,
    display: 'ar' // or 'en'
  };

  try {
    const response = await axios.post(`${baseUrl}/v3/payment/sessions`, payload, {
      headers: {
        'Authorization': secretKey || '',
        'api-key': apiKey || secretKey || '',
        'Content-Type': 'application/json'
      }
    });

    return {
      ...(response.data.data || {}),
      ...response.data
    };
  } catch (error: any) {
    const detail = error.response?.data || error.message;
    console.error('Kashier Session Error:', JSON.stringify(detail, null, 2));
    throw new Error('Failed to create payment session');
  }
};

/**
 * Verifies the webhook signature from Kashier
 */
export const verifyWebhookSignature = (body: any, signature: string): boolean => {
  const { secretKey } = KASHIER_CONFIG;
  const { data } = body;

  if (!data || !data.signatureKeys || !secretKey) return false;

  // 1. Sort signature keys alphabetically
  const sortedKeys = [...data.signatureKeys].sort();

  // 2. Build query string from sorted keys
  const signaturePayload = sortedKeys
    .map(key => `${key}=${data[key]}`)
    .join('&');

  // 3. Generate HMAC-SHA256 hash using Secret Key
  const calculatedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signaturePayload)
    .digest('hex');

  return signature === calculatedSignature;
};

/**
 * Verifies transaction status directly with Kashier API
 */
export const verifyTransactionStatus = async (merchantOrderId: string) => {
  const { secretKey, apiKey, baseUrl } = KASHIER_CONFIG;

  try {
    // Correct V3 endpoint for checking by merchant order ID
    const response = await axios.get(`${baseUrl}/v3/payment/sessions?merchantOrderId=${merchantOrderId}`, {
      headers: {
        'Authorization': secretKey || '',
        'api-key': apiKey || secretKey || ''
      }
    });


    return response.data;
  } catch (error: any) {
    console.error('Kashier Verification Error:', error.response?.data || error.message);
    return null;
  }
};
