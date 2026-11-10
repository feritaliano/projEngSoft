/**
 * Stored operations that do not form a valid timeline (a row breaking RN04, or a position going negative). The API
 * rejects every change that would cause it (RN04, RN10), so it can only come from data written outside the API: a
 * server fault (500 with the cause in the log), never a client error nor a silently wrong number.
 */
export class InconsistentTimelineError extends Error {
  constructor(
    readonly portfolioId: string,
    readonly assetId: string,
    reason = 'goes negative',
    options?: ErrorOptions,
  ) {
    super(
      `Timeline of asset ${assetId} in portfolio ${portfolioId} ${reason}`,
      options,
    );
    this.name = 'InconsistentTimelineError';
  }
}
