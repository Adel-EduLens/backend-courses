import axios from 'axios';

interface WapilotConfig {
  instance: string;
  token: string;
}

interface SendMessageResult {
  phone: string;
  success: boolean;
  error?: string;
}

const resolveConfig = (config?: WapilotConfig): WapilotConfig => {
  const instance =
    config?.instance ??
    process.env.WAPILOT_INSTANCE ??
    process.env.WAPILOT_FORGOT_PASSWORD_INSTANCE;
  const token =
    config?.token ??
    process.env.WAPILOT_TOKEN ??
    process.env.WAPILOT_FORGOT_PASSWORD_TOKEN;

  if (!instance || !token) {
    throw new Error('Missing Wapilot configuration. Set WAPILOT_INSTANCE and WAPILOT_TOKEN.');
  }

  return { instance, token };
};

const formatPhoneForWapilot = (phone: string) => {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return '2' + digits;
  return '20' + digits;
};

/**
 * Send a WhatsApp message to a single phone number via Wapilot.
 */
export const sendSingleMessage = async (
  phone: string,
  message: string,
  config?: WapilotConfig
): Promise<void> => {
  const { instance, token } = resolveConfig(config);
  const chatId = formatPhoneForWapilot(phone);
  const url = `https://api.wapilot.net/api/v2/${instance}/send-message`;

  await axios.post(
    url,
    { chat_id: chatId, text: message },
    { headers: { token, 'Content-Type': 'application/json' } }
  );
};

/**
 * Send the same WhatsApp message to multiple phone numbers via Wapilot.
 */
export const sendBulkMessage = async (
  phones: string[],
  message: string,
  config?: WapilotConfig
): Promise<SendMessageResult[]> => {
  const { instance, token } = resolveConfig(config);
  const url = `https://api.wapilot.net/api/v2/${instance}/send-message`;

  const results = await Promise.allSettled(
    phones.map((phone) => {
      const chatId = formatPhoneForWapilot(phone);
      return axios.post(
        url,
        { chat_id: chatId, text: message },
        { headers: { token, 'Content-Type': 'application/json' } }
      );
    })
  );

  return results.map((result, index) => {
    const phone = phones[index] as string;
    if (result.status === 'fulfilled') {
      return { phone, success: true } as SendMessageResult;
    } else {
      const errorResponse = result.reason?.response?.data;
      console.error(`Wapilot Error for ${phone}:`, {
        message: result.reason?.message,
        response: errorResponse,
        config: {
          instance,
          url
        }
      });
      return {
        phone,
        success: false,
        error: errorResponse?.message || result.reason?.message || 'Unknown error',
      } as SendMessageResult;
    }
  });
};

