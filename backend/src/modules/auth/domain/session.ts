import { DomainError } from '../../../shared/domain/domain-error';

/** SHA-256 of a refresh token (lowercase hex, D39). Branded so the raw token can never be stored or looked up by mistake. */
export type TokenHash = string & { readonly __brand: 'TokenHash' };

/** A refresh-token session (ops.user_sessions, D39). Only the token hash is stored. */
export interface StoredSession {
  readonly id: string;
  readonly userId: string;
  /** Rotation chain: every refresh creates a new session in the same family and revokes the previous one. */
  readonly familyId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export interface NewSession {
  readonly userId: string;
  readonly familyId: string;
  readonly tokenHash: TokenHash;
  readonly expiresAt: Date;
}

export type RefreshTokenState = 'valid' | 'reused' | 'expired';

/**
 * D39: a revoked token presented again is treated as leaked and the caller revokes the whole family; an expired token
 * simply ends the session. A token revoked by logout and replayed also counts as reused: revoking its (already
 * revoked) family again is harmless.
 */
export function refreshTokenState(
  session: StoredSession,
  now: Date,
): RefreshTokenState {
  if (session.revokedAt !== null) {
    return 'reused';
  }
  return session.expiresAt.getTime() <= now.getTime() ? 'expired' : 'valid';
}

/** Login with an unknown e-mail or a wrong password (same error for both, A2). */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('E-mail or password is incorrect');
  }
}

export type InvalidRefreshReason =
  | Exclude<RefreshTokenState, 'valid'>
  | 'missing'
  | 'unknown'
  | 'user-not-found';

/** The refresh token cannot start a new session; the client must log in again ("sessão expirada", D41). */
export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'INVALID_REFRESH_TOKEN';

  constructor(readonly reason: InvalidRefreshReason) {
    super(`Refresh token rejected: ${reason}`);
  }
}

/** Port (auth owns ops.user_sessions, arquitetura 7.2). */
export abstract class SessionRepository {
  abstract create(session: NewSession): Promise<void>;
  abstract findByTokenHash(tokenHash: TokenHash): Promise<StoredSession | null>;
  /**
   * Atomically revokes `currentId` (only if still active) and creates `next`. Returns false, creating nothing, when
   * the current session was already revoked (a concurrent refresh with the same token).
   */
  abstract rotate(
    currentId: string,
    next: NewSession,
    now: Date,
  ): Promise<boolean>;
  abstract revokeFamily(familyId: string, now: Date): Promise<void>;
}

export interface IssuedAccessToken {
  readonly token: string;
  /** Lifetime in seconds. */
  readonly expiresIn: number;
}

/** Port: short-lived signed access token (JWT) carrying the user id. */
export abstract class AccessTokens {
  abstract sign(userId: string): Promise<IssuedAccessToken>;
  /** The user id of a valid, unexpired token; null otherwise. */
  abstract verify(token: string): Promise<string | null>;
}

export interface GeneratedRefreshToken {
  readonly token: string;
  readonly hash: TokenHash;
}

/** Port: opaque random refresh token and its hash (SHA-256, lowercase hex, D39). */
export abstract class RefreshTokens {
  abstract generate(): GeneratedRefreshToken;
  abstract hashOf(token: string): TokenHash;
}
