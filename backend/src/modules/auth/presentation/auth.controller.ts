import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { API_PREFIX } from '../../../shared/presentation/api-prefix';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { Public } from '../../../shared/presentation/auth-context';
import { ProblemException } from '../../../shared/presentation/problem-details';
import { EmailAlreadyRegisteredError } from '../../users/domain/user';
import { LogIn } from '../application/log-in.use-case';
import { LogOut } from '../application/log-out.use-case';
import { RefreshSession } from '../application/refresh-session.use-case';
import { AuthSession, AuthSettings } from '../application/session-issuer';
import { SignUp } from '../application/sign-up.use-case';
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../domain/session';
import { AuthResponseDto, LogInDto, SignUpDto } from './auth.dto';

export const REFRESH_COOKIE = 'refresh_token';
/** The cookie is only sent to the auth routes, never to the rest of the API. */
export const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`;

/** Domain errors of the auth flow as HTTP problems; anything else propagates (500 by the global filter). */
function toProblem(error: unknown): unknown {
  if (error instanceof EmailAlreadyRegisteredError) {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'This e-mail is already registered.',
      { field: 'email' },
    );
  }
  if (error instanceof InvalidValueError) {
    return new ProblemException(HttpStatus.BAD_REQUEST, error.message, {
      field: error.field,
    });
  }
  if (error instanceof InvalidCredentialsError) {
    return new ProblemException(
      HttpStatus.UNAUTHORIZED,
      'E-mail or password is incorrect.',
    );
  }
  if (error instanceof InvalidRefreshTokenError) {
    return new ProblemException(
      HttpStatus.UNAUTHORIZED,
      'The session has expired. Log in again.',
    );
  }
  return error;
}

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly signUp: SignUp,
    private readonly logIn: LogIn,
    private readonly refreshSession: RefreshSession,
    private readonly logOut: LogOut,
    settings: AuthSettings,
  ) {
    this.secureCookie = settings.secureCookies;
  }

  /** A1: sign-up; the user is logged in right away. Rate limited (A2/D52). */
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({
    description: 'E-mail already registered (field: email).',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts.' })
  async register(
    @Body() body: SignUpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const session = await this.signUp.execute(body).catch((error: unknown) => {
      throw toProblem(error);
    });
    return this.respond(session, reply);
  }

  /** A2: login. Unknown e-mail and wrong password give the same 401. Rate limited. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'E-mail or password is incorrect.' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts.' })
  async login(
    @Body() body: LogInDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const session = await this.logIn
      .execute(body.email, body.password)
      .catch((error: unknown) => {
        throw toProblem(error);
      });
    return this.respond(session, reply);
  }

  /** New access token and rotated refresh cookie (D39). 401 = session expired: log in again. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Session expired or revoked.' })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    try {
      const session = await this.refreshSession.execute(
        request.cookies[REFRESH_COOKIE],
      );
      return this.respond(session, reply);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        this.clearRefreshCookie(reply);
      }
      throw toProblem(error);
    }
  }

  /** Revokes the session family of the cookie and clears it: 204. The cookie is cleared even if revoking fails (500). */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiNoContentResponse()
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.logOut.execute(request.cookies[REFRESH_COOKIE]);
    } finally {
      this.clearRefreshCookie(reply);
    }
  }

  private respond(session: AuthSession, reply: FastifyReply): AuthResponseDto {
    void reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.secureCookie,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshTokenExpiresAt,
    });
    return {
      accessToken: session.accessToken,
      tokenType: 'Bearer',
      expiresIn: session.expiresIn,
      // Field by field: nothing beyond the public profile can reach the response body.
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    };
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    void reply.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.secureCookie,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }
}
