#!/bin/sh
# Inside Compose the database is the "postgres" service, not localhost. When DATABASE_HOST is set, rewrites only the
# host and port of DATABASE_URL and SHADOW_DATABASE_URL (user, password and database stay as in the root .env), then
# runs the command in place of this shell, so signals reach Node directly.
set -eu

rewrite_host() {
  printf '%s' "$1" | sed -E "s#@[^@/]+/#@${DATABASE_HOST}:${DATABASE_PORT:-5432}/#"
}

if [ -n "${DATABASE_HOST:-}" ]; then
  if [ -n "${DATABASE_URL:-}" ]; then
    DATABASE_URL="$(rewrite_host "$DATABASE_URL")"
    export DATABASE_URL
  fi
  if [ -n "${SHADOW_DATABASE_URL:-}" ]; then
    SHADOW_DATABASE_URL="$(rewrite_host "$SHADOW_DATABASE_URL")"
    export SHADOW_DATABASE_URL
  fi
fi

exec "$@"
