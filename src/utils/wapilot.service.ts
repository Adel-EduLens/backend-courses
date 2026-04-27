import axios from 'axios';

const WAPILOT_BASE_URL = 'https://api.wapilot.io/api/sendMessage';

interface WapilotConfig {
  instance: string;
  token: string;
}

interface SendMessageResult {
  phone: string;
  success: boolean;
  error?: string;
}

/**
 * Build the base Wapilot request config
 */
const getConfig = (instance: string, token: string) => ({
  baseURL: WAPILOT_BASE_URL,
  params: { instance, token },
});

/**
 * Send a WhatsApp message to a single phone number via Wapilot.
 *
 * @param phone   - Recipient phone number (e.g. "201012345678" — no +)
 * @param message - Text message to send
 * @param config  - Wapilot instance & token (defaults to env vars)
 */
export const sendSingleMessage = async (
  phone: string,
  message: string,
  config?: WapilotConfig
): Promise<void> => {
  const instance = config?.instance ?? (process.env.WAPILOT_FORGOT_PASSWORD_INSTANCE as string);
  const token = config?.token ?? (process.env.WAPILOT_FORGOT_PASSWORD_TOKEN as string);

  await axios.post(
    WAPILOT_BASE_URL,
    { phone, message },
    { params: { instance, token } }
  );
};

/**
 * Send the same WhatsApp message to multiple phone numbers via Wapilot.
 * Sends requests concurrently and returns per-number results.
 *
 * @param phones  - Array of recipient phone numbers
 * @param message - Text message to send to all recipients
 * @param config  - Wapilot instance & token (defaults to env vars)
 * @returns Array of { phone, success, error? } for each number
 */
export const sendBulkMessage = async (
  phones: string[],
  message: string,
  config?: WapilotConfig
): Promise<SendMessageResult[]> => {
  const instance = config?.instance ?? (process.env.WAPILOT_FORGOT_PASSWORD_INSTANCE as string);
  const token = config?.token ?? (process.env.WAPILOT_FORGOT_PASSWORD_TOKEN as string);

  const results = await Promise.allSettled(
    phones.map((phone) =>
      axios.post(
        WAPILOT_BASE_URL,
        { phone, message },
        { params: { instance, token } }
      )
    )
  );

  return results.map((result, index) => {
    const phone = phones[index] as string;
    if (result.status === 'fulfilled') {
      return { phone, success: true } as SendMessageResult;
    } else {
      return {
        phone,
        success: false,
        error: result.reason?.message ?? 'Unknown error',
      } as SendMessageResult;
    }
  });
};
