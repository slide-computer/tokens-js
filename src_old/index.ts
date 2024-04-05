import { ActorConfig, HttpAgent } from "@dfinity/agent";
import { intersect, UnionToIntersection } from "./utils";
import {
  AccountType,
  BaseToken,
  IdentifiedCall,
  Token,
  TokenType,
} from "./tokens/token";
import { ICP_TYPE, IcpMethods, IcpToken } from "./tokens/icpToken";
// import { SLD_TYPE, SldMethods, SldToken } from "./tokens/sldToken";
import { EXT_TYPE, ExtMethods, ExtToken } from "./tokens/extToken";
import {
  DIP721_V2_TYPE,
  Dip721V2Methods,
  Dip721V2Token,
} from "./tokens/dip721V2Token";
import {
  DIP721_V2_BETA_TYPE,
  Dip721V2BetaMethods,
  Dip721V2BetaToken,
} from "./tokens/dip721V2BetaToken";
import {
  DIP721_LEGACY_TYPE,
  Dip721LegacyMethods,
  Dip721LegacyToken,
} from "./tokens/dip721LegacyToken";
import { Icrc1Token } from "./tokens/icrc1Token";
import { DIP20_TYPE, Dip20Methods, Dip20Token } from "./tokens/dip20Token";

export interface TokenManagerConfig<T extends string | undefined = undefined>
  extends ActorConfig {
  readonly supportedStandards?: T[];
}

export class TokenManager {
  private static readonly tokens = [
    Icrc1Token,
    IcpToken,
    // SldToken,
    ExtToken,
    Dip721V2Token,
    Dip721V2BetaToken,
    Dip721LegacyToken,
    Dip20Token,
  ];
  private readonly _tokens: (BaseToken & Token)[];

  protected constructor(config: TokenManagerConfig<any>) {
    this._tokens = TokenManager.getTokens(config.supportedStandards ?? []).map(
      (token) => token.create(config)
    ) as typeof this._tokens;
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

  static create<
    T extends string | undefined = undefined,
    M = T extends
      | ICP_TYPE
      // | SLD_TYPE
      | EXT_TYPE
      | DIP721_V2_TYPE
      | DIP721_V2_BETA_TYPE
      | DIP721_LEGACY_TYPE
      | DIP20_TYPE
      ? IcpMethods<T> &
          // SldMethods<T> &
          ExtMethods<T> &
          Dip721V2Methods<T> &
          Dip721V2BetaMethods<T> &
          Dip721LegacyMethods<T> &
          Dip20Methods<T>
      : Partial<Token>,
    R = T extends string ? UnionToIntersection<M> : Promise<M>
  >(config: TokenManagerConfig<T>): R {
    if (config.supportedStandards) {
      return new TokenManager(config) as unknown as R;
    }
    return TokenManager.supportedStandards(config).then(
      (supportedStandards) =>
        new TokenManager({
          ...config,
          supportedStandards: supportedStandards.map(({ name }) => name),
        })
    ) as unknown as R;
  }

  static async supportedStandards(config: ActorConfig) {
    return (
      await Promise.all(
        TokenManager.tokens.map((token) =>
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

  static tokenType(supportedStandards: string[]): TokenType | undefined {
    return TokenManager.getTokens(supportedStandards)[0]?.tokenType(
      supportedStandards
    );
  }

  static accountType(supportedStandards: string[]): AccountType | undefined {
    const accountTypes = TokenManager.getTokens(supportedStandards).map(
      (token) => token.accountType
    );
    if (accountTypes.includes("hash")) {
      // Least strict account type, all tokens that accept a hash can also accept account and principal
      return "hash";
    }
    if (accountTypes.includes("account")) {
      // All tokens that accept an account can also accept principal
      return "account";
    }
    if (accountTypes.includes("principal")) {
      // Only principals are supported, hash is not supported and accounts will use the primary subaccount
      return "principal";
    }
  }

  static identifyCall(
    supportedStandards: string[],
    methodName: string,
    args: any[]
  ): IdentifiedCall | undefined {
    for (const token of TokenManager.getTokens(supportedStandards)) {
      const data = token.identifyCall(methodName, args);
      if (data) {
        return data;
      }
    }
  }

  private static getTokens(supportedStandards: string[]) {
    return TokenManager.tokens.reduce(
      (tokens, token) =>
        intersect(supportedStandards, token.implementedStandards).length
          ? [...tokens, token]
          : tokens,
      [] as typeof TokenManager.tokens
    );
  }
}

// Re-export utils and all tokens
export * from "./utils";
export * from "./tokens/token";
export * from "./tokens/icrc1Token";
export * from "./tokens/icpToken";
// export * from "./tokens/sldToken";
export * from "./tokens/extToken";
export * from "./tokens/dip721V2Token";
export * from "./tokens/dip721V2BetaToken";
export * from "./tokens/dip721LegacyToken";
export * from "./tokens/dip20Token";
