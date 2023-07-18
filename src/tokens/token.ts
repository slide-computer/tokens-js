import { ActorConfig, ActorSubclass } from "@dfinity/agent";
import { TokenManagerConfig } from "../index";
import { Principal } from "@dfinity/principal";
import { Value } from "./icrc1/icrc1.did";

export interface Token {
  metadata(): Promise<Array<[string, Value]> | undefined>;

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

  metadataOf(tokenId?: bigint): Promise<Array<[string, Value]> | undefined>;

  transfer(
    args: {
      fromSubaccount?: Uint8Array;
      to: string;
      memo?: Uint8Array;
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ): Promise<bigint>;

  approve(
    args: {
      fromSubaccount?: Uint8Array;
      spender: string;
      memo?: Uint8Array;
      createdAtTime?: bigint;
    } & (
      | { tokenId: bigint; approved: boolean }
      | {
          amount: bigint;
          expectedAllowance?: bigint;
          expiresAt?: bigint;
          fee?: bigint;
        }
    )
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
      spenderSubaccount?: Uint8Array;
      from: string;
      to: string;
      memo?: Uint8Array;
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ): Promise<bigint>;

  allowance(args: {
    account: string;
    spender: string;
  }): Promise<{ allowance: bigint; expiresAt?: bigint }>;

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

  attributesOf(tokenId: bigint): Promise<
    | Array<{
        value: Value;
        traitType?: string;
        displayType?: string;
      }>
    | undefined
  >;
}

export type AccountType = "account" | "principal" | "hash";
export type TokenType = "fungible" | "nonFungible";

export abstract class BaseToken {
  static implementedStandards: readonly string[];
  static accountType: AccountType;

  static create: <T extends string>(
    config: TokenManagerConfig<T>
  ) => BaseToken & Partial<Token>;

  static createActor: (config: ActorConfig) => ActorSubclass<any>;

  static supportedStandards: (
    config: ActorConfig
  ) => Promise<Array<{ name: string; url: string }>>;

  static tokenType: (supportedStandard: string[]) => TokenType;

  protected _config: TokenManagerConfig<string>;

  protected constructor(config: TokenManagerConfig<string>) {
    this._config = config;
  }
}
