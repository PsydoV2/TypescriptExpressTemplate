import {
  runWithRequestId,
  getRequestId,
  setRequestIdentity,
  getRequestMeta,
} from "../../../src/utils/RequestContext";

describe("RequestContext", () => {
  it("defaults ip to 'unknown' and identity to 'anonymous' when no initial ip is given", () => {
    runWithRequestId("req-1", () => {
      expect(getRequestId()).toBe("req-1");
      expect(getRequestMeta()).toEqual({
        ip: "unknown",
        identity: "anonymous",
      });
    });
  });

  it("uses the provided ip when passed as the initial value", () => {
    runWithRequestId(
      "req-2",
      () => {
        expect(getRequestMeta()).toEqual({
          ip: "1.2.3.4",
          identity: "anonymous",
        });
      },
      { ip: "1.2.3.4" },
    );
  });

  it("setRequestIdentity overwrites the identity for the current request", () => {
    runWithRequestId(
      "req-3",
      () => {
        setRequestIdentity("user:abc123");
        expect(getRequestMeta()).toEqual({
          ip: "5.6.7.8",
          identity: "user:abc123",
        });
      },
      { ip: "5.6.7.8" },
    );
  });

  it("setRequestIdentity is a no-op outside a request context", () => {
    expect(() => setRequestIdentity("user:xyz")).not.toThrow();
  });

  it("getRequestId and getRequestMeta return undefined outside a request context", () => {
    expect(getRequestId()).toBeUndefined();
    expect(getRequestMeta()).toEqual({ ip: undefined, identity: undefined });
  });

  it("keeps separate contexts isolated across concurrent async calls", async () => {
    const results: string[] = [];

    await Promise.all([
      new Promise<void>((resolve) => {
        runWithRequestId(
          "req-a",
          () => {
            setTimeout(() => {
              results.push(`${getRequestId()}:${getRequestMeta().identity}`);
              resolve();
            }, 10);
          },
          { ip: "10.0.0.1" },
        );
      }),
      new Promise<void>((resolve) => {
        runWithRequestId(
          "req-b",
          () => {
            setRequestIdentity("user:b");
            setTimeout(() => {
              results.push(`${getRequestId()}:${getRequestMeta().identity}`);
              resolve();
            }, 5);
          },
          { ip: "10.0.0.2" },
        );
      }),
    ]);

    expect(results.sort()).toEqual(["req-a:anonymous", "req-b:user:b"]);
  });
});
