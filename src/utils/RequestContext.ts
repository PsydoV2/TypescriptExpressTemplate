import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
  ip: string;
  identity: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestId = (
  requestId: string,
  fn: () => void,
  initial?: { ip: string },
): void => {
  requestContextStorage.run(
    { requestId, ip: initial?.ip ?? "unknown", identity: "anonymous" },
    fn,
  );
};

export const getRequestId = (): string | undefined => {
  return requestContextStorage.getStore()?.requestId;
};

/**
 * Overwrites the current request's identity once it's known — meant to be
 * called by auth middleware after it has verified a token. No-op outside a
 * request context.
 */
export const setRequestIdentity = (identity: string): void => {
  const store = requestContextStorage.getStore();
  if (store) {
    store.identity = identity;
  }
};

export const getRequestMeta = (): { ip?: string; identity?: string } => {
  const store = requestContextStorage.getStore();
  return { ip: store?.ip, identity: store?.identity };
};
