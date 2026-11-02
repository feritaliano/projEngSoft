import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  IS_PUBLIC_ROUTE,
  RequestWithUser,
} from '../../../shared/presentation/auth-context';
import { AccessTokens } from '../domain/session';

const BEARER = /^Bearer ([^\s]+)$/;

/**
 * Global guard: every route needs a valid access token (Authorization: Bearer) unless marked @Public(). A missing,
 * malformed, expired or forged token is 401 (problem+json), and the frontend then tries /auth/refresh.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokens,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & RequestWithUser>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    const userId = token ? await this.accessTokens.verify(token) : null;
    if (!userId) {
      // RFC 6750: a 401 for a Bearer-protected resource names the scheme.
      void context
        .switchToHttp()
        .getResponse<FastifyReply>()
        .header('WWW-Authenticate', 'Bearer');
      throw new UnauthorizedException('A valid access token is required.');
    }
    request.user = { id: userId };
    return true;
  }
}
