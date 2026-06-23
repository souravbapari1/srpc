/** Typed RPC client mapped from a generated service interface. */
export type RpcClient<T> = {
  [K in keyof T as T[K] extends (...args: never) => unknown ? K : never]: T[K] extends (
    params: infer P
  ) => infer R
    ? (params: P) => Promise<Awaited<R>>
    : never;
};
