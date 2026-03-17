import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  requestId: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestId = (requestId: string, fn: () => void): void => {
  requestContextStorage.run({ requestId }, fn);
};

export const getRequestId = (): string | undefined => {
  return requestContextStorage.getStore()?.requestId;
};
