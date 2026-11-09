/** OpenAPI security scheme of the access token (Authorization: Bearer), required by default on protected routes. */
export const BEARER_SCHEME = 'bearer';

/** OpenAPI security scheme of the refresh token cookie; only /auth/refresh and /auth/logout declare it. */
export const REFRESH_TOKEN_SCHEME = 'refresh_token';
