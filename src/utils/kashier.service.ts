import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });

const KASHIER_CONFIG = {
  merchantId: process.env.KASHIER_MERCHANT_ID,
  apiKey: process.env.KASHIER_API_KEY,
  secretKey: process.env.KASHIER_SECRET_KEY,
  mode: process.env.KASHIER_MODE || 'test',
  checkoutUrl: 'https://checkout.kashier.io',
};

const getKashierHashKey = () => KASHIER_CONFIG.apiKey || KASHIER_CONFIG.secretKey || '';

const formatKashierAmount = (amount: number) => amount.toFixed(2);

const generateCheckoutHash = (merchantId: string, orderId: string, amount: string, currency: string) => {
  const hashKey = getKashierHashKey();
  const hashPayload = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`;

  return crypto
    .createHmac('sha256', hashKey)
    .update(hashPayload)
    .digest('hex');
};

/**
 * Calculates the final amount including Kashier fees (1.5% + 2 EGP)
 * Formula: (baseAmount + 2) / (1 - 0.015)
 */
export const calculateAmountWithFees = (baseAmount: number): number => {
  const finalAmount = (baseAmount + 2) / (1 - 0.015);
  return Math.round(finalAmount * 100) / 100;
};

/**
 * Creates a Kashier hosted checkout URL.
 */
export const createPaymentSession = async (orderData: {
  amount: number;
  merchantOrderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) => {
  const { merchantId, checkoutUrl, mode } = KASHIER_CONFIG;

  try {
    if (!merchantId || !getKashierHashKey()) {
      throw new Error('Missing Kashier merchant ID or payment API key');
    }

    const currency = 'EGP';
    const amount = formatKashierAmount(orderData.amount);
    const merchantRedirect = `${process.env.BASE_URL}/api/payments/kashier/success`;
    const hash = generateCheckoutHash(merchantId, orderData.merchantOrderId, amount, currency);
    const metaData = JSON.stringify({
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail || '',
      customerPhone: orderData.customerPhone || ''
    });

    return {
      sessionUrl: `${checkoutUrl}?${new URLSearchParams({
        merchantId,
        orderId: orderData.merchantOrderId,
        amount,
        currency,
        hash,
        merchantRedirect,
        metaData,
        failureRedirect: 'true',
        redirectMethod: 'get',
        display: 'ar',
        mode
      }).toString()}`
    };
  } catch (error: any) {
    const detail = error.response?.data || error.message;
    console.error('Kashier Session Error:', JSON.stringify(detail, null, 2));
    throw new Error('Failed to create payment session');
  }
};

export const verifyRedirectSignature = (query: Record<string, unknown>): boolean => {
  const signature = String(query.signature || '');
  const hashKey = getKashierHashKey();

  if (!signature || !hashKey) return false;

  const signaturePayload = [
    ['paymentStatus', query.paymentStatus],
    ['cardDataToken', query.cardDataToken],
    ['maskedCard', query.maskedCard],
    ['merchantOrderId', query.merchantOrderId],
    ['orderId', query.orderId],
    ['cardBrand', query.cardBrand],
    ['orderReference', query.orderReference],
    ['transactionId', query.transactionId],
    ['amount', query.amount],
    ['currency', query.currency],
  ]
    .map(([key, value]) => `${key}=${value ?? ''}`)
    .join('&');

  const calculatedSignature = crypto
    .createHmac('sha256', hashKey)
    .update(signaturePayload)
    .digest('hex');

  return signature === calculatedSignature;
};

/**
 * Verifies the webhook signature from Kashier
 */
export const verifyWebhookSignature = (body: any, signature: string): boolean => {
  const { secretKey } = KASHIER_CONFIG;
  const { data } = body;

  if (!data || !data.signatureKeys || !secretKey) return false;

  const sortedKeys = [...data.signatureKeys].sort();

  const signaturePayload = sortedKeys
    .map(key => `${key}=${data[key]}`)
    .join('&');

  const calculatedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signaturePayload)
    .digest('hex');

  return signature === calculatedSignature;
};
