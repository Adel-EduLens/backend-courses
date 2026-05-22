import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });

const cleanEnvValue = (value: string | undefined) => {
  if (!value) return value;

  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\\$/g, '$');
};

const getKashierConfig = () => ({
  merchantId: cleanEnvValue(process.env.KASHIER_MERCHANT_ID),
  apiKey: cleanEnvValue(process.env.KASHIER_API_KEY),
  secretKey: cleanEnvValue(process.env.KASHIER_SECRET_KEY),
  mode: process.env.KASHIER_MODE || 'test',
  baseUrl:
    process.env.KASHIER_MODE === 'live'
      ? 'https://api.kashier.io'
      : 'https://test-api.kashier.io',
});

const getKashierHashKey = () => {
  const { apiKey, secretKey } = getKashierConfig();
  return apiKey || secretKey || '';
};

const getSecretFingerprint = (value: string | undefined) => {
  if (!value) return null;

  return {
    length: value.length,
    sha256Prefix: crypto.createHash('sha256').update(value).digest('hex').slice(0, 12),
  };
};

const normalizePublicUrl = (url: string | undefined, label: string) => {
  if (!url || !/^https?:\/\//.test(url)) {
    throw new Error(`${label} must be a public HTTP(S) URL for Kashier callbacks`);
  }

  return url.replace(/\/$/, '');
};

const getPublicBaseUrl = () => normalizePublicUrl(process.env.BASE_URL, 'BASE_URL');

/**
 * Calculates the final amount including Kashier fees (1.5% + 2 EGP)
 * Formula: (baseAmount + 2) / (1 - 0.015)
 */
export const calculateAmountWithFees = (baseAmount: number): number => {
  const finalAmount = (baseAmount + 2) / (1 - 0.015);
  return Math.round(finalAmount * 100) / 100;
};

/**
 * Creates a payment session with Kashier V3 API.
 */
export const createPaymentSession = async (orderData: {
  amount: number;
  merchantOrderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) => {
  const { merchantId, secretKey, apiKey, baseUrl } = getKashierConfig();

  const payload = {
    merchantId,
    amount: String(orderData.amount),
    currency: 'EGP',
    merchantOrderId: orderData.merchantOrderId,
    customer: {
      reference: orderData.merchantOrderId,
      name: orderData.customerName,
      email: orderData.customerEmail || 'customer@example.com',
      phone: orderData.customerPhone || '01000000000',
    },
    serverWebhook: `${getPublicBaseUrl()}/api/payments/kashier/webhook`,
    merchantRedirect: `${getPublicBaseUrl()}/api/payments/kashier/success`,
    display: 'en',
  };

  try {
    if (!merchantId || !getKashierHashKey()) {
      throw new Error('Missing Kashier merchant ID or payment API key');
    }

    console.log('[Kashier Session] Creating V3 session:', {
      endpoint: `${baseUrl}/v3/payment/sessions`,
      mode: process.env.KASHIER_MODE || 'test',
      merchantId,
      hasApiKey: Boolean(apiKey),
      hasSecretKey: Boolean(secretKey),
      apiKeyFingerprint: getSecretFingerprint(apiKey),
      secretKeyFingerprint: getSecretFingerprint(secretKey),
      merchantOrderId: orderData.merchantOrderId,
      amount: payload.amount,
      currency: payload.currency,
      serverWebhook: payload.serverWebhook,
      merchantRedirect: payload.merchantRedirect,
    });

    const response = await axios.post(`${baseUrl}/v3/payment/sessions`, payload, {
      headers: {
        Authorization: secretKey || '',
        'api-key': apiKey || secretKey || '',
        'Content-Type': 'application/json',
      },
    });

    return {
      ...(response.data.data || {}),
      ...response.data,
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

export const getKashierOrderDetails = async (merchantOrderId: string) => {
  const { secretKey, apiKey, baseUrl } = getKashierConfig();

  if (!merchantOrderId || (!secretKey && !apiKey)) return null;

  try {
    const response = await axios.get(`${baseUrl}/payments/orders/${encodeURIComponent(merchantOrderId)}`, {
      headers: {
        Authorization: secretKey || apiKey || '',
      },
    });

    return response.data?.response || response.data;
  } catch (error: any) {
    const detail = error.response?.data || error.message;
    console.error('Kashier Order Reconciliation Error:', JSON.stringify(detail, null, 2));
    return null;
  }
};

/**
 * Verifies the webhook signature from Kashier
 */
export const verifyWebhookSignature = (body: any, signature: string): boolean => {
  const { secretKey } = getKashierConfig();
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
