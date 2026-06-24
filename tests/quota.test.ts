import { jest } from "@jest/globals";

// Mock Redis and DB before importing quota
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockIncr = jest.fn();
const mockDecr = jest.fn();

jest.mock("../src/lib/redis", () => ({
  redis: {
    get: mockGet,
    set: mockSet,
    incr: mockIncr,
    decr: mockDecr,
  },
}));

jest.mock("../src/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/lib/models", () => ({
  TenantSubscription: {
    findOne: jest.fn().mockResolvedValue({
      monthlyMessageLimit: 100,
      extraMessageCredits: 0,
      usedMessages: 50,
    }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

import { assertAndReserveQuota } from "../src/lib/quota";

describe("Quota System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow message when under quota", async () => {
    mockSet.mockResolvedValue("OK");
    mockIncr.mockResolvedValue(51); // 51 of 100

    await expect(assertAndReserveQuota("tenant-abc")).resolves.not.toThrow();
    expect(mockIncr).toHaveBeenCalled();
  });

  it("should reject message when quota is exceeded and decrement", async () => {
    mockSet.mockResolvedValue("OK");
    mockIncr.mockResolvedValue(101); // 101 of 100

    await expect(assertAndReserveQuota("tenant-abc")).rejects.toThrow();
    expect(mockDecr).toHaveBeenCalled();
  });

  it("should allow if no subscription exists (fail open)", async () => {
    const { TenantSubscription } = require("../src/lib/models");
    (TenantSubscription.findOne as jest.Mock).mockResolvedValueOnce(null);

    await expect(assertAndReserveQuota("tenant-no-sub")).resolves.not.toThrow();
  });

  it("should allow if limit is 0 or negative (unlimited)", async () => {
    const { TenantSubscription } = require("../src/lib/models");
    (TenantSubscription.findOne as jest.Mock).mockResolvedValueOnce({
      monthlyMessageLimit: 0,
      extraMessageCredits: 0,
      usedMessages: 0,
    });

    await expect(assertAndReserveQuota("tenant-unlimited")).resolves.not.toThrow();
    expect(mockIncr).not.toHaveBeenCalled();
  });
});
