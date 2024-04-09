import type { MetadataValue } from "./metadata";

export type CommonTokenMethods = {
  metadata(): Promise<Array<[string, MetadataValue]>>;

  name(): Promise<string>;

  symbol(): Promise<string>;

  logo(): Promise<string | undefined>;

  totalSupply(): Promise<bigint>;

  maxMemoSize(): Promise<number>;

  balanceOf(account: string): Promise<bigint>;
};
