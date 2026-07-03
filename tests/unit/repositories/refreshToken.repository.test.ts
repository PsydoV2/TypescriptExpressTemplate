import { PoolConnection } from "mysql2/promise";
import { RefreshTokenRepository } from "../../../src/repositories/refreshToken.repository";

function mockDb() {
  return { query: jest.fn() } as unknown as PoolConnection & {
    query: jest.Mock;
  };
}

describe("RefreshTokenRepository", () => {
  it("creates a token and stores its hash, not the raw value", async () => {
    const db = mockDb();
    db.query.mockResolvedValue([{}]);

    const rawToken = await RefreshTokenRepository.create("user-1", db);

    expect(rawToken).toEqual(expect.any(String));
    const [, params] = db.query.mock.calls[0];
    expect(params).toEqual([
      expect.any(String),
      "user-1",
      expect.any(String),
      expect.any(Date),
    ]);
    expect(params[2]).not.toBe(rawToken);
  });

  it("findByToken returns null when no row matches", async () => {
    const db = mockDb();
    db.query.mockResolvedValue([[]]);

    const result = await RefreshTokenRepository.findByToken("some-token", db);
    expect(result).toBeNull();
  });

  it("findByToken reports expired tokens", async () => {
    const db = mockDb();
    db.query.mockResolvedValue([
      [{ userID: "user-1", expiresAt: new Date(Date.now() - 1000) }],
    ]);

    const result = await RefreshTokenRepository.findByToken("some-token", db);
    expect(result).toEqual({ userID: "user-1", expired: true });
  });

  it("findByToken reports valid, non-expired tokens", async () => {
    const db = mockDb();
    db.query.mockResolvedValue([
      [{ userID: "user-1", expiresAt: new Date(Date.now() + 60_000) }],
    ]);

    const result = await RefreshTokenRepository.findByToken("some-token", db);
    expect(result).toEqual({ userID: "user-1", expired: false });
  });

  it("revoke updates the row by hash", async () => {
    const db = mockDb();
    db.query.mockResolvedValue([{}]);

    await RefreshTokenRepository.revoke("some-token", db);

    const [sql] = db.query.mock.calls[0];
    expect(sql).toContain("UPDATE RefreshTokens SET revoked");
  });
});
