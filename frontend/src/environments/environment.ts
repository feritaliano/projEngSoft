// shortcut: one environment for local development, E2E and CI; add environment.production.ts when there is a deploy target.
export const environment = {
  /** API origin. The paths of the contract (backend/openapi/openapi.json) already start with /api/v1. */
  apiRootUrl: 'http://localhost:3000',
};
