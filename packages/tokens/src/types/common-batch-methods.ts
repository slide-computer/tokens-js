export type CommonTokenBatchMethods = {
  batchBalanceOf(accounts: string[]): Promise<bigint[]>;
};
