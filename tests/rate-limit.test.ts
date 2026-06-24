import { jest } from "@jest/globals";

// Mock redis before importing rate-limit
const mockIncr = jest.fn();
const mockPexpire = jest.fn();
jest.mock("../src/lib/redis", () => ({
  redis: {
    incr: mockIncr,
    pexpire: mockPexpire,
  },
}));

import { checkRateLimit } from "../src/lib/rate-limit";

describe("Redis Rate Limiter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow the first request", async () => {
    mockIncr.mockResolvedValue(1);
    mockPexpire.mockResolvedValue(1);

    await expect(checkRateLimit("test:key", { limit: 10, windowMs: 60_000 })).resolves.not.toThrow();
    expect(mockPexpire).toHaveBeenCalledWith("ratelimit:test:key", 60_000);
  });

  it("should not set expiry after the first request", async () => {
    mockIncr.mockResolvedValue(5);
    mockPexpire.mockResolvedValue(1);

    await checkRateLimit("test:key", { limit: 10, windowMs: 60_000 });
    expect(mockPexpire).not.toHaveBeenCalled();
  });

  it("should throw when limit is exceeded", async () => {
    mockIncr.mockResolvedValue(11);

    await expect(
      checkRateLimit("test:key", { limit: 10, windowMs: 60_000 })
    ).rejects.toThrow("Too many requests. Please try again later.");
  });

  it("should fail open on Redis error", async () => {
    mockIncr.mockRejectedValue(new Error("Redis connection refused"));

    // Should NOT throw — fail open to preserve availability
    await expect(
      checkRateLimit("test:key", { limit: 10, windowMs: 60_000 })
    ).resolves.not.toThrow();
  });

  it("should use separate keys for different identifiers", async () => {
    mockIncr.mockResolvedValue(1);
    mockPexpire.mockResolvedValue(1);

    await checkRateLimit("ip:1.2.3.4", { limit: 5, windowMs: 30_000 });
    await checkRateLimit("ip:5.6.7.8", { limit: 5, windowMs: 30_000 });

    expect(mockIncr).toHaveBeenCalledWith("ratelimit:ip:1.2.3.4");
    expect(mockIncr).toHaveBeenCalledWith("ratelimit:ip:5.6.7.8");
  });
});
