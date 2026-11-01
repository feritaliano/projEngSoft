import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PrismaDatabasePing } from './prisma-database-ping';

describe('PrismaDatabasePing', () => {
  it('runs SELECT 1', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const ping = new PrismaDatabasePing({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);

    await ping.ping();

    const [strings] = queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join('')).toBe('SELECT 1');
  });

  it('propagates the database error', async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error('down'));
    const ping = new PrismaDatabasePing({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);

    await expect(ping.ping()).rejects.toThrow('down');
  });
});
