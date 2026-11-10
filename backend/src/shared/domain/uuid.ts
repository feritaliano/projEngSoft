const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True when the value can be a database uuid. Ids from the client are checked before any query: a malformed one would
 * reach PostgreSQL as an invalid uuid (500) instead of "not found" or a 400 with its field.
 */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
