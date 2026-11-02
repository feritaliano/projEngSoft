import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export const IS_PUBLIC_ROUTE = 'isPublicRoute';

/** Opts a route out of the global JWT guard (health, sign-up, login, refresh, logout). Everything else needs a token. */
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);

/** Who is calling, set by the JWT guard on every protected route. */
export interface AuthenticatedUser {
  readonly id: string;
}

export interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * The authenticated user of a protected route. Ownership checks use this id in the use case (e.g. a portfolio of
 * another user answers 404), never an id sent by the client.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user) {
      // Only reachable if a route marked @Public() asks for the user: a programming error, not a client error.
      throw new Error('CurrentUser used on a route without authentication');
    }
    return user;
  },
);
