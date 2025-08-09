const RETRYABLE = new Set([429, 500, 502, 503, 504])
const MAX_RETRIES = 5
const INITIAL_BACKOFF_MS = 800

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const status = Number(err?.code || err?.status || err?.response?.status)
      const retryable = RETRYABLE.has(status)
      if (retryable && attempt <= MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * 2 ** (attempt - 1)
        const jitter = backoff * 0.2 * Math.random()
        await new Promise(r => setTimeout(r, backoff + jitter))
        continue
      }
      throw err
    }
  }
}
