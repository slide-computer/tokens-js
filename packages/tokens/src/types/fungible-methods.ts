export type FungibleTokenMethods = {
  decimals(): Promise<number>;

  fee(): Promise<bigint>;

  mintingAccount(): Promise<string | undefined>;

  transfer(args: {
    amount: bigint;
    fee?: bigint;
    fromSubaccount?: ArrayBuffer;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint>;

  transferFrom(args: {
    amount: bigint;
    fee?: bigint;
    spenderSubaccount?: ArrayBuffer;
    from: string;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint>;

  approve(args: {
    amount: bigint;
    fromSubaccount?: ArrayBuffer;
    spender: string;
    fee?: bigint;
    expiresAt?: bigint;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
    expectedAllowance?: bigint;
  }): Promise<bigint>;

  allowance(args: {
    account: string;
    spender: string;
  }): Promise<{ allowance: bigint; expiresAt?: bigint }>;
};
