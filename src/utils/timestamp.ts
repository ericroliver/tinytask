/**
 * Timestamp utility — convert SQLite timestamps to ISO 8601 format
 *
 * SQLite's CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" (UTC, no timezone marker).
 * ISO 8601 requires "YYYY-MM-DDTHH:MM:SSZ". This helper normalizes the format.
 * If the timestamp already contains a 'T' separator, it is returned as-is.
 */
export function toISO8601(timestamp: string): string {
  if (timestamp.includes('T')) {
    return timestamp;
  }
  return timestamp.replace(' ', 'T') + 'Z';
}
