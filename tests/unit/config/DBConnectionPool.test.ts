import {
  DBConnectionPool,
  getDBPoolStats,
} from "../../../src/config/DBConnectionPool";

type CorePool = { _allConnections?: unknown; _freeConnections?: unknown };

function corePool(): CorePool {
  return (DBConnectionPool as unknown as { pool: CorePool }).pool;
}

describe("getDBPoolStats", () => {
  it("reads total/free from the pool's internal connection queues", () => {
    corePool()._allConnections = { length: 7 };
    corePool()._freeConnections = { length: 4 };

    expect(getDBPoolStats()).toEqual({ total: 7, free: 4, limit: 20 });
  });

  it("falls back to null when the internal shape is missing", () => {
    corePool()._allConnections = undefined;
    corePool()._freeConnections = undefined;

    expect(getDBPoolStats()).toEqual({ total: null, free: null, limit: 20 });
  });

  it("falls back to null when length isn't a number (future mysql2 shape change)", () => {
    corePool()._allConnections = { length: "not-a-number" };
    corePool()._freeConnections = {};

    expect(getDBPoolStats()).toEqual({ total: null, free: null, limit: 20 });
  });

  it("falls back to null entirely if the internal pool property disappears", () => {
    const original = (DBConnectionPool as unknown as { pool: unknown }).pool;
    (DBConnectionPool as unknown as { pool: unknown }).pool = undefined;

    expect(getDBPoolStats()).toEqual({ total: null, free: null, limit: 20 });

    (DBConnectionPool as unknown as { pool: unknown }).pool = original;
  });

  it("always reports the configured connection limit", () => {
    expect(getDBPoolStats().limit).toBe(20);
  });
});
