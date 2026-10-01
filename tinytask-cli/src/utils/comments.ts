/**
 * Returns the last `limit` items of `items`. Used by comment-truncating
 * options (`task get --include-comments N`, `comment list --limit N`) and
 * by `task get`'s default (latest-comment-only) behavior to keep only the
 * most recent N entries.
 *
 * Rules:
 * - limit undefined/null → all items
 * - limit 0 or negative → empty array
 * - non-array input → empty array
 */
export function takeLast<T>(items: unknown, limit?: number | null): T[] {
  if (!Array.isArray(items)) {
    return [];
  }
  if (limit === undefined || limit === null) {
    return [...items] as T[];
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    return [];
  }
  return items.slice(-limit) as T[];
}
