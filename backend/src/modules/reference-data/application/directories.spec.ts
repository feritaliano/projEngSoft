import {
  AssetCatalog,
  AssetRecord,
  Broker,
  BrokerCatalog,
} from '../domain/catalog';
import { AssetDirectory, BrokerDirectory } from './directories';

const PETR4 = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90';
const BOND = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d91';
const XP = '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a57';

const RECORD: AssetRecord = {
  id: BOND,
  ticker: null,
  assetType: 'FIXED_INCOME',
  issuer: 'Tesouro Nacional',
  sector: null,
  cryptoName: null,
  fixedIncomeTypeName: 'Tesouro IPCA+',
  maturityDate: '2035-05-15',
};

function assetCatalog(active: AssetRecord | null, byIds: AssetRecord[]) {
  return {
    findActiveById: jest.fn().mockResolvedValue(active),
    findByIds: jest.fn().mockResolvedValue(byIds),
  } as unknown as AssetCatalog & {
    findActiveById: jest.Mock;
    findByIds: jest.Mock;
  };
}

describe('AssetDirectory (arquitetura 7.2: read service of the catalog)', () => {
  it('finds an active asset by id with its display name (D50)', async () => {
    const catalog = assetCatalog(RECORD, []);

    await expect(
      new AssetDirectory(catalog).findActive(BOND),
    ).resolves.toMatchObject({
      id: BOND,
      ticker: null,
      displayName: 'Tesouro IPCA+ 2035',
    });
    expect(catalog.findActiveById).toHaveBeenCalledWith(BOND);
  });

  it('answers null for a missing or inactive asset, and for a malformed id without querying', async () => {
    const catalog = assetCatalog(null, []);
    const directory = new AssetDirectory(catalog);

    await expect(directory.findActive(PETR4)).resolves.toBeNull();
    await expect(directory.findActive('abc')).resolves.toBeNull();
    expect(catalog.findActiveById).toHaveBeenCalledTimes(1);
  });

  it('maps assets by id, deduplicating and skipping malformed ids; no query for none', async () => {
    const catalog = assetCatalog(null, [RECORD]);
    const directory = new AssetDirectory(catalog);

    const map = await directory.byIds([BOND, BOND, 'abc']);

    expect([...map.keys()]).toEqual([BOND]);
    expect(catalog.findByIds).toHaveBeenCalledWith([BOND]);
    await expect(directory.byIds(['abc'])).resolves.toEqual(new Map());
    expect(catalog.findByIds).toHaveBeenCalledTimes(1);
  });
});

describe('BrokerDirectory (RN04, D9)', () => {
  const broker: Broker = { id: XP, name: 'XP Investimentos', cnpj: null };

  it('finds a broker by id, null when missing or malformed', async () => {
    const findByIds = jest
      .fn()
      .mockResolvedValueOnce([broker])
      .mockResolvedValueOnce([]);
    const directory = new BrokerDirectory({
      findByIds,
    } as unknown as BrokerCatalog);

    await expect(directory.findById(XP)).resolves.toEqual(broker);
    await expect(directory.findById(XP)).resolves.toBeNull();
    await expect(directory.findById('abc')).resolves.toBeNull();
    expect(findByIds).toHaveBeenCalledTimes(2);
  });
});
