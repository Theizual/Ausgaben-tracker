import { nanoid } from 'nanoid';

/**
 * Generates a unique ID using nanoid.
 * It's a highly efficient and collision-resistant ID generator.
 * @returns A unique ID string.
 */
export function generateUUID(): string {
  return nanoid();
}