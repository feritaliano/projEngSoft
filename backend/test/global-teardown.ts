export default async function globalTeardown(): Promise<void> {
  await globalThis.__POSTGRES_CONTAINER__?.stop();
  globalThis.__POSTGRES_CONTAINER__ = undefined;
}
