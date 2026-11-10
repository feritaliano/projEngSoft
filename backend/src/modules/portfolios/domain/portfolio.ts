import {
  DomainError,
  InvalidValueError,
} from '../../../shared/domain/domain-error';

/** Same limit as portfolios.name (VARCHAR(150), counted in characters). */
export const PORTFOLIO_NAME_MAX_LENGTH = 150;

// Control characters (C0, DEL, C1): invisible in the UI, and PostgreSQL rejects NUL in text.
const CONTROL_CHARACTERS = /\p{Cc}/u;

/** RN02: a portfolio name, trimmed, with 1 to 150 characters and no control characters. */
export class PortfolioName {
  private constructor(private readonly value: string) {}

  static of(value: string): PortfolioName {
    const name = value.trim();
    if (name.length === 0) {
      throw new InvalidValueError('name', 'REQUIRED', 'is required');
    }
    if ([...name].length > PORTFOLIO_NAME_MAX_LENGTH) {
      throw new InvalidValueError(
        'name',
        'TOO_LONG',
        `must have at most ${PORTFOLIO_NAME_MAX_LENGTH} characters`,
        { max: PORTFOLIO_NAME_MAX_LENGTH },
      );
    }
    if (CONTROL_CHARACTERS.test(name)) {
      throw new InvalidValueError(
        'name',
        'INVALID_VALUE',
        'must not contain control characters',
      );
    }
    return new PortfolioName(name);
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

export interface Portfolio {
  readonly id: string;
  readonly name: string;
}

/** A portfolio with its operation count and last trade date, taken in the same query (D41, never columns). */
export interface PortfolioWithOperationCount extends Portfolio {
  readonly operationCount: number;
  /** YYYY-MM-DD of the most recent operation; null without operations (header of the detail, frame 6). */
  readonly lastTradeDate: string | null;
}

/** RN02: the name is unique per user (UNIQUE (user_id, name): case-sensitive, after the trim). */
export class PortfolioNameTakenError extends DomainError {
  readonly code = 'PORTFOLIO_NAME_TAKEN';

  constructor() {
    super('A portfolio with this name already exists');
  }
}

/** RN02: a missing portfolio and one of another user get the same answer (404). */
export class PortfolioNotFoundError extends DomainError {
  readonly code = 'PORTFOLIO_NOT_FOUND';

  constructor() {
    super('Portfolio not found');
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A portfolio id known to be a uuid. Branded so the repository cannot receive a raw path parameter: a malformed id
 * would reach the database as an invalid uuid (500) instead of "not found".
 */
export type PortfolioId = string & { readonly __brand: 'PortfolioId' };

/** Null when the value cannot name a portfolio: callers answer it as PortfolioNotFoundError (RN02). */
export function parsePortfolioId(value: string): PortfolioId | null {
  return UUID.test(value) ? (value as PortfolioId) : null;
}

/**
 * Port (the portfolios module owns the portfolios table, arquitetura 7.2). Every read and delete is scoped by the
 * owner: no method reaches a portfolio by its id alone.
 */
export abstract class PortfolioRepository {
  /** Throws PortfolioNameTakenError when the user already has a portfolio with this name. */
  abstract create(userId: string, name: PortfolioName): Promise<Portfolio>;
  /** Ordered by creation. */
  abstract listOwned(userId: string): Promise<PortfolioWithOperationCount[]>;
  abstract findOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<PortfolioWithOperationCount | null>;
  /** Ownership only, without counting anything (checked on every request of the operations module). */
  abstract existsOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<boolean>;
  /** False when the portfolio does not exist or belongs to another user. Operations go by ON DELETE CASCADE (D41). */
  abstract deleteOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<boolean>;
}
