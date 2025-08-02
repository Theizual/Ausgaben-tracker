
/**
 * Extracts the Google Sheet ID from a given URL.
 * @param url The Google Sheet URL.
 * @returns The extracted sheet ID or null if not found.
 */
export function extractSheetIdFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
