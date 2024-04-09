export type FungibleTokenBatchMethods = {
  batchTransfer(
    args: Array<{
      amount: bigint;
      fee?: bigint;
      fromSubaccount?: ArrayBuffer;
      to: string;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>>;

  batchTransferFrom(
    args: Array<{
      amount: bigint;
      fee?: bigint;
      spenderSubaccount?: ArrayBuffer;
      from: string;
      to: string;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>>;

  batchApprove(
    args: Array<{
      amount: bigint;
      fromSubaccount?: ArrayBuffer;
      spender: string;
      fee?: bigint;
      expiresAt?: bigint;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
      expectedAllowance?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>>;

  batchAllowance(
    args: Array<{
      account: string;
      spender: string;
    }>,
  ): Promise<Array<{ allowance: bigint; expiresAt?: bigint }>>;
};
