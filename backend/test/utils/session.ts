import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

export interface TestSession {
  userId: string;
  /** Authorization header value. */
  bearer: string;
}

/** Signs a user up through the API (A1) and returns its access token; e-mails must be unique per test. */
export async function signUp(
  app: NestFastifyApplication,
  email: string,
  name = 'Ana Souza',
): Promise<TestSession> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'segredo123' })
    .expect(201);
  const body = response.body as { accessToken: string; user: { id: string } };
  return { userId: body.user.id, bearer: `Bearer ${body.accessToken}` };
}
