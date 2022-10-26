import { ActorConfig, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { intersect } from "./utils";
import { BaseToken, Token } from "./tokens/token";
import { IcpToken } from "./tokens/icpToken";
import { SldToken } from "./tokens/sldToken";
import { ExtToken } from "./tokens/extToken";
import { Dip721V2Token } from "./tokens/dip721V2Token";
import { Dip721Token } from "./tokens/dip721Token";
import { Value } from "./tokens/sld/sld.did";

export interface TokenManagerConfig<S extends string = string>
  extends ActorConfig {
  supportedStandards?: readonly S[];
}

export class TokenManager implements Token {
  private static readonly _tokens = [
    IcpToken,
    SldToken,
    ExtToken,
    Dip721V2Token,
    Dip721Token,
  ];
  private readonly _tokens: (BaseToken & Token)[];

  protected constructor(config: TokenManagerConfig) {
    this._tokens = TokenManager._tokens.reduce((tokens, token) => {
      if (
        intersect(config.supportedStandards ?? [], token.implementedStandards)
          .length
      ) {
        tokens.push(token.create(config) as unknown as BaseToken & Token);
      }
      return tokens;
    }, [] as typeof this._tokens);
  }

  public static async create(config: TokenManagerConfig) {
    const supportedStandards =
      config.supportedStandards ??
      (await TokenManager.supportedStandards(config)).map(({ name }) => name);
    if (supportedStandards.length) {
      return new TokenManager({ ...config, supportedStandards });
    }

    throw Error("No supported standards found for canister");
  }

  public static async supportedStandards(config: ActorConfig) {
    return (
      await Promise.all(
        TokenManager._tokens.map((token) =>
          token.supportedStandards({
            ...config,
            agent:
              config.agent instanceof HttpAgent
                ? new HttpAgent({
                    source: config.agent,
                    retryTimes: 1, // Only try to get supported standards for each token once
                  })
                : config.agent,
          })
        )
      )
    ).flat();
  }

  public async metadata() {
    return this._getMethod("metadata")();
  }

  public async name() {
    return this._getMethod("name")();
  }

  public async symbol() {
    return this._getMethod("symbol")();
  }

  public async decimals() {
    return this._getMethod("decimals")();
  }

  public async fee() {
    return this._getMethod("fee")();
  }

  public async totalSupply() {
    return this._getMethod("totalSupply")();
  }

  public async mintingAccount() {
    return this._getMethod("mintingAccount")();
  }

  public async balanceOf(account: string) {
    return this._getMethod("balanceOf")(account);
  }

  public async ownerOf(tokenId: bigint) {
    return this._getMethod("ownerOf")(tokenId);
  }

  public async tokens(page?: bigint) {
    return this._getMethod("tokens")(page);
  }

  public async tokensOf(account: string, page?: bigint) {
    return this._getMethod("tokensOf")(account, page);
  }

  public async metadataOf(tokenId: bigint) {
    return this._getMethod("metadataOf")(tokenId);
  }

  public async transfer(
    args: {
      to: string;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & (
      | {
          tokenId: bigint;
        }
      | { amount: bigint }
    )
  ) {
    return this._getMethod("transfer")(args);
  }

  public async approve(
    args: {
      spender: Principal;
      approved: boolean;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint })
  ) {
    return this._getMethod("approve")(args);
  }

  public async setApproval(
    args: {
      spender: Principal;
      approved: boolean;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint })
  ) {
    return this._getMethod("setApproval")(args);
  }

  public async getApproved(tokenId: bigint) {
    return this._getMethod("getApproved")(tokenId);
  }

  public async setApprovalForAll(args: {
    operator: Principal;
    approved: boolean;
    fromSubaccount?: Uint8Array | number[] | bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }) {
    return this._getMethod("setApprovalForAll")(args);
  }

  public async isApprovedForAll(operator: Principal, account: string) {
    return this._getMethod("isApprovedForAll")(operator, account);
  }

  public async transferFrom(
    args: {
      from: string;
      to: string;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint; fee?: bigint })
  ) {
    return this._getMethod("transferFrom")(args);
  }

  public async allowance(args: { account: string; spender: Principal }) {
    return this._getMethod("allowance")(args);
  }

  public async getCustodians() {
    return this._getMethod("getCustodians")();
  }

  public async setCustodian(args: { custodian: Principal; approved: boolean }) {
    return this._getMethod("setCustodian")(args);
  }

  public async mint(args: {
    to: string;
    tokenId?: bigint;
    metadata?: { [key: string]: Value };
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }) {
    return this._getMethod("mint")(args);
  }

  public async burn(args: {
    tokenId: bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }) {
    return this._getMethod("burn")(args);
  }

  public async royaltyFee(amount: bigint) {
    return this._getMethod("royaltyFee")(amount);
  }

  public async setRoyaltyFee(args: { account: string; fee: number }) {
    return this._getMethod("setRoyaltyFee")(args);
  }

  public async icon() {
    return this._getMethod("icon")();
  }

  public async logo() {
    return this._getMethod("logo")();
  }

  public async logoSquare() {
    return this._getMethod("logoSquare")();
  }

  public async assetOf(tokenId: bigint) {
    return this._getMethod("assetOf")(tokenId);
  }

  public async thumbnailOf(tokenId: bigint) {
    return this._getMethod("thumbnailOf")(tokenId);
  }

  public supportsMethod<T extends keyof Token>(method: T) {
    return this._tokens.some((t) => method in t);
  }

  private _getMethod<T extends keyof Token>(method: T): Token[T] {
    const token = this._tokens.find((t) => method in t);
    if (!token) {
      throw Error("Method not implemented");
    }
    return token[method].bind(token) as Token[T];
  }
}

// Re-export utils and all tokens
export * from "./utils";
export * from "./tokens/token";
export * from "./tokens/icpToken";
export * from "./tokens/sldToken";
export * from "./tokens/extToken";
export * from "./tokens/dip721Token";
export * from "./tokens/dip721V2Token";
