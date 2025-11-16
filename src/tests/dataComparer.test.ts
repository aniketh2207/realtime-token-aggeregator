/// <reference path="./jest.d.ts" />
import { compareAndUpdateCache } from '../services/dataComparer';

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockIo = {
  emit: jest.fn(),
};

// A helper to create a mock AppToken
const createAppToken = (address: string, price: number, volume: number) => ({
  token_address: address,
  token_name: 'Test Token',
  token_ticker: 'TEST',
  price_sol: price,
  volume_sol: volume,
  market_cap_sol: 1000,
  liquidity_sol: 100,
  transaction_count: 100,
  price_1hr_change: 0,
  price_24hr_change: 0,
  price_7d_change: 0,
  protocol: 'test',
});

// Reset mocks before each test
beforeEach(() => {
  mockRedisClient.get.mockReset();
  mockRedisClient.set.mockReset();
  mockIo.emit.mockReset();
});

// --- TEST 1 ---
test('should save to cache if no old data exists', async () => {
  mockRedisClient.get.mockResolvedValue(null); // No old data
  const newTokenList = [createAppToken('token1', 100, 1000)];

  await compareAndUpdateCache(newTokenList, mockRedisClient as any, mockIo as any);

  // We expect 'set' to be called
  expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
  // We expect 'emit' NOT to be called
  expect(mockIo.emit).not.toHaveBeenCalled();
});

// --- TEST 2 
test('should emit an update on a significant price spike', async () => {
  const oldToken = createAppToken('token1', 100, 1000);
  const newToken = createAppToken('token1', 150, 1000); // 50% price spike

  mockRedisClient.get.mockResolvedValue(JSON.stringify([oldToken]));

  await compareAndUpdateCache([newToken], mockRedisClient as any, mockIo as any);

  // We expect 'set' to be called (to save the new data)
  expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
  // We expect 'emit' TO BE CALLED
  expect(mockIo.emit).toHaveBeenCalledTimes(1);
  expect(mockIo.emit).toHaveBeenCalledWith('liveUpdate', {
    updates: [
      {
        token_address: 'token1',
        price_sol: 150,
        volume_sol: 1000,
        price_1hr_change: 0,
      },
    ],
  });
});

// --- TEST 3 (Happy Path - Volume Spike) ---
test('should emit an update on a significant volume spike', async () => {
  const oldToken = createAppToken('token1', 100, 1000);
  const newToken = createAppToken('token1', 100, 50000); // 49,000 volume spike

  mockRedisClient.get.mockResolvedValue(JSON.stringify([oldToken]));

  await compareAndUpdateCache([newToken], mockRedisClient as any, mockIo as any);

  expect(mockIo.emit).toHaveBeenCalledTimes(1);
});

// --- TEST 4 (Edge Case - No Change) ---
test('should NOT emit an update if change is below threshold', async () => {
  const oldToken = createAppToken('token1', 100, 1000);
  const newToken = createAppToken('token1', 100.01, 1001); // Tiny change

  mockRedisClient.get.mockResolvedValue(JSON.stringify([oldToken]));

  await compareAndUpdateCache([newToken], mockRedisClient as any, mockIo as any);

  // We expect 'set' to be called (it always saves)
  expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
  // But 'emit' should NOT be called
  expect(mockIo.emit).not.toHaveBeenCalled();
});