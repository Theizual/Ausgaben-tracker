import { nanoid } from 'nanoid';

/**
 * Generates a unique ID using nanoid, with an optional prefix.
 * @param prefix A short prefix for the entity type (e.g., 'tx', 'cat').
 * @returns A unique ID string like 'tx_someRandomChars'.
 */
export function generateUUID(prefix?: string): string {
  return prefix ? `${prefix}_${nanoid()}` : nanoid();
}