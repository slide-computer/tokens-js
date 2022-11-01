import { ActorConfig, HttpAgent } from "@dfinity/agent";
import { intersect, UnionToIntersection } from "./utils";
import { BaseToken, Token } from "./tokens/token";
import { IcpMethods, IcpToken } from "./tokens/icpToken";
import { SldMethods, SldToken } from "./tokens/sldToken";
import { ExtMethods, ExtToken } from "./tokens/extToken";
import { Dip721V2Methods, Dip721V2Token } from "./tokens/dip721V2Token";
import {
  Dip721V2BetaMethods,
  Dip721V2BetaToken,
} from "./tokens/dip721V2BetaToken";
import {
  Dip721LegacyMethods,
  Dip721LegacyToken,
} from "./tokens/dip721LegacyToken";

export interface TokenManagerConfig<T extends string | undefined = undefined>
  extends ActorConfig {
  readonly supportedInterfaces?: T[];
}

export class TokenManager {
  private static readonly _tokens = [
    IcpToken,
    SldToken,
    ExtToken,
    Dip721V2Token,
    Dip721V2BetaToken,
    Dip721LegacyToken,
  ];
  private readonly _tokens: (BaseToken & Token)[];

  protected constructor(config: TokenManagerConfig<any>) {
    this._tokens = TokenManager._tokens.reduce((tokens, token) => {
      if (
        intersect(config.supportedInterfaces ?? [], token.implementedInterfaces)
          .length
      ) {
        tokens.push(token.create(config) as unknown as BaseToken & Token);
      }
      return tokens;
    }, [] as typeof this._tokens);
    const methods: Array<keyof Token> = [
      "metadata",
      "name",
      "symbol",
      "decimals",
      "fee",
      "totalSupply",
      "mintingAccount",
      "balanceOf",
      "ownerOf",
      "tokens",
      "tokensOf",
      "metadataOf",
      "transfer",
      "approve",
      "setApproval",
      "getApproved",
      "setApprovalForAll",
      "isApprovedForAll",
      "transferFrom",
      "allowance",
      "getCustodians",
      "setCustodian",
      "mint",
      "burn",
      "royaltyFee",
      "setRoyaltyFee",
      "logo",
      "assetOf",
      "imageOf",
      "attributesOf",
    ];
    methods.forEach((method) => {
      if (this._tokens.some((t) => method in t)) {
        // @ts-ignore
        this[method] = (...args: any[]) => {
          const token = this._tokens.find((t) => method in t);
          if (!token) {
            throw Error("Method not implemented");
          }
          // @ts-ignore
          return token[method].apply(token, args);
        };
      }
    });
  }

  public static create<
    T extends string | undefined = undefined,
    M = T extends string
      ? IcpMethods<T> &
          SldMethods<T> &
          ExtMethods<T> &
          Dip721V2Methods<T> &
          Dip721V2BetaMethods<T> &
          Dip721LegacyMethods<T>
      : Partial<Token>,
    R = T extends string ? UnionToIntersection<M> : Promise<M>
  >(config: TokenManagerConfig<T>): R {
    if (config.supportedInterfaces) {
      return new TokenManager(config) as R;
    }
    return TokenManager.supportedInterfaces(config).then(
      (supportedInterfaces) =>
        new TokenManager({
          ...config,
          supportedInterfaces: supportedInterfaces.map(({ name }) => name),
        })
    ) as R;
  }

  public static async supportedInterfaces(config: ActorConfig) {
    return (
      await Promise.all(
        TokenManager._tokens.map((token) =>
          token.supportedInterfaces({
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
}

// Re-export utils and all tokens
export * from "./utils";
export * from "./tokens/token";
export * from "./tokens/icpToken";
export * from "./tokens/sldToken";
export * from "./tokens/extToken";
export * from "./tokens/dip721V2Token";
export * from "./tokens/dip721V2BetaToken";
export * from "./tokens/dip721LegacyToken";
