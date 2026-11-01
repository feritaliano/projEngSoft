/** Port: checks that the database answers. Implemented in infrastructure; used as the DI token. */
export abstract class DatabasePing {
  /** Resolves when the database answers; rejects otherwise. */
  abstract ping(): Promise<void>;
}
