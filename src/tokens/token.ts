import { ActorConfig, ActorSubclass } from "@dfinity/agent";
import { TokenManagerConfig } from "../index";
import { Principal } from "@dfinity/principal";

export type Value =
  | { Int: bigint }
  | { Nat: bigint }
  | { Blob: Array<number> }
  | { Text: string };

export interface Token {
  metadata(): Promise<{ [key: string]: Value }>;

  name(): Promise<string>;

  symbol(): Promise<string>;

  decimals(): Promise<number>;

  fee(): Promise<bigint>;

  totalSupply(): Promise<bigint>;

  mintingAccount(): Promise<string>;

  balanceOf(account: string): Promise<bigint>;

  ownerOf(tokenId: bigint): Promise<string | undefined>;

  tokens(page?: bigint): Promise<bigint[]>;

  tokensOf(account: string, page?: bigint): Promise<bigint[]>;

  metadataOf(tokenId?: bigint): Promise<{ [key: string]: Value } | undefined>;

  transfer(
    args: {
      to: string;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ): Promise<bigint>;

  approve(
    args: {
      spender: Principal;
      approved: boolean;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ): Promise<bigint>;

  setApproval(
    args: {
      spender: Principal;
      approved: boolean;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ): Promise<bigint>;

  getApproved(tokenId: bigint): Promise<Principal[]>;

  setApprovalForAll(args: {
    operator: Principal;
    approved: boolean;
    fromSubaccount?: Uint8Array | number[] | bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint>;

  isApprovedForAll(operator: Principal, account: string): Promise<boolean>;

  transferFrom(
    args: {
      from: string;
      to: string;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ): Promise<bigint>;

  allowance(args: { account: string; spender: Principal }): Promise<bigint>;

  mint(args: {
    to: string;
    tokenId?: bigint;
    metadata?: { [key: string]: Value };
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint>;

  burn(args: {
    tokenId: bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint>;

  getCustodians(): Promise<Principal[]>;

  setCustodian(args: {
    custodian: Principal;
    approved: boolean;
  }): Promise<bigint>;

  royaltyFee(amount: bigint): Promise<{ account: string; fee: bigint }>;

  setRoyaltyFee(args: { account: string; fee: number }): Promise<bigint>;

  logo(): Promise<string | undefined>;

  assetOf(tokenId: bigint): Promise<
    | {
        location: string;
        type?: string;
      }
    | undefined
  >;

  imageOf(tokenId: bigint): Promise<string | undefined>;
}

export abstract class BaseToken {
  public static readonly implementedInterfaces: string[];

  public static create: <T extends string>(
    config: TokenManagerConfig<T>
  ) => BaseToken & Partial<Token>;

  public static createActor: (config: ActorConfig) => ActorSubclass<any>;

  public static supportedInterfaces: (
    config: ActorConfig
  ) => Promise<Array<{ name: string; url: string }>>;

  protected readonly _config: TokenManagerConfig;

  protected constructor(config: TokenManagerConfig) {
    this._config = config;
  }
}
