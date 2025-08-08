const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

/**
 * A utility function to wrap Google API calls with an exponential backoff retry mechanism.
 * @param apiCall The async function to call.
 * @returns The result of the successful API call.
 * @throws An error if the API call fails after all retries or with a non-retryable status code.
 */
export async function withRetry<T>(apiCall: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      const status = error?.response?.status || error?.code;
      const isRetryable = typeof status === 'number' && RETRYABLE_STATUS_CODES.includes(status);
      
      if (isRetryable && attempt < MAX_RETRIES) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = backoffTime * 0.2 * Math.random();
        const waitTime = backoffTime + jitter;
        
        console.warn(`[API Retry] Attempt ${attempt} failed with status ${status}. Retrying in ${waitTime.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Non-retryable error or max retries reached, re-throw the error.
        console.error(`[API Retry] Final attempt ${attempt} failed with status ${status}. Throwing error.`, error);
        throw error;
      }
    }
  }
}