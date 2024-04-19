import type {
  Attribute,
  CommonTokenBatchMethods,
  CommonTokenMethods,
  DecodeCall,
  FungibleTokenBatchMethods,
  FungibleTokenMethods,
  ImplementedStandards,
  MetadataValue,
  NonFungibleTokenBatchMethods,
  NonFungibleTokenMethods,
  SupportedStandards,
  SupportedStandardsWithoutConfig,
  TokenMetadataMethods,
} from "../types";
import type { ActorConfig, Agent } from "@dfinity/agent";

export type TokenConfig = ActorConfig & {
  queryAgent?: Agent;
};

type TokenImplementation = ImplementedStandards &
  Partial<SupportedStandards & DecodeCall<any> & TokenMetadataMethods> &
  (new (
    config: TokenConfig,
  ) => Partial<
    CommonTokenMethods &
      FungibleTokenMethods &
      NonFungibleTokenMethods &
      CommonTokenBatchMethods &
      FungibleTokenBatchMethods &
      NonFungibleTokenBatchMethods
  >);

type SupportedToken<
  T extends ImplementedStandards,
  S extends readonly string[],
> =
  Record<T["implementedStandards"][number], unknown> extends Record<
    S[number],
    unknown
  >
    ? T
    : never;

type SupportedTokens<
  T extends ImplementedStandards,
  S extends readonly string[],
> = T extends unknown ? SupportedToken<T, S> : never;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

export const createToken = <
  Tokens extends TokenImplementation,
  Config extends TokenConfig & {
    supportedStandards?: string[] | readonly string[];
  },
  Wrapper = UnionToIntersection<
    Config["supportedStandards"] extends string[]
      ? Partial<InstanceType<Tokens>>
      : Config["supportedStandards"] extends readonly string[]
        ? InstanceType<SupportedTokens<Tokens, Config["supportedStandards"]>>
        : Partial<InstanceType<Tokens>>
  > &
    SupportedStandardsWithoutConfig &
    ImplementedStandards &
    (Tokens extends DecodeCall<any>
      ? Pick<Tokens, "decodeCall">
      : DecodeCall<unknown>) &
    TokenMetadataMethods,
  PossiblyPromise = Config["supportedStandards"] extends
    | string[]
    | readonly string[]
    ? Wrapper
    : Promise<Wrapper>,
>(
  tokens: Tokens[] | readonly Tokens[],
  config: Config,
): PossiblyPromise => {
  if (!config.supportedStandards) {
    return Promise.all(
      tokens.map(
        (token) =>
          token.supportedStandards?.({
            ...config,
            agent: config.queryAgent ?? config.agent,
          }) ?? [],
      ),
    )
      .then((supportedStandards) => [
        ...new Set(supportedStandards.flat().map(({ name }) => name)),
      ])
      .then((supportedStandards) =>
        createToken(tokens, {
          ...config,
          supportedStandards,
        }),
      ) as PossiblyPromise;
  }
  const supportedTokens = tokens.filter((token) =>
    token.implementedStandards.every((standard) =>
      config.supportedStandards?.includes(standard),
    ),
  );
  const supportedTokenInstances = supportedTokens.map(
    (token) => new token(config),
  );

  const tokensWrapper: SupportedStandardsWithoutConfig &
    ImplementedStandards &
    DecodeCall<any> &
    TokenMetadataMethods = {
    implementedStandards: supportedTokens.flatMap(
      (supportedToken) => supportedToken.implementedStandards,
    ),

    async supportedStandards(): Promise<Array<{ name: string; url: string }>> {
      return [
        ...new Map(
          (
            await Promise.all(
              tokens.map((token) => token.supportedStandards?.(config) ?? []),
            )
          )
            .flat()
            .map((supportedStandard) => [
              supportedStandard.name,
              supportedStandard,
            ]),
        ).values(),
      ];
    },

    decodeCall(
      method: string,
      args: ArrayBuffer,
    ): ReturnType<DecodeCall<any>["decodeCall"]> {
      for (let supportedToken of supportedTokens) {
        const decoded = supportedToken.decodeCall?.(method, args);
        if (decoded) {
          return decoded;
        }
      }
    },

    tokenMetadataToName(
      metadata: Array<[string, MetadataValue]>,
    ): string | undefined {
      for (let supportedToken of supportedTokens) {
        const name = supportedToken.tokenMetadataToName?.(metadata);
        if (name) {
          return name;
        }
      }
    },

    tokenMetadataToDescription(
      metadata: Array<[string, MetadataValue]>,
    ): string | undefined {
      for (let supportedToken of supportedTokens) {
        const description =
          supportedToken.tokenMetadataToDescription?.(metadata);
        if (description) {
          return description;
        }
      }
    },

    tokenMetadataToImage(
      metadata: Array<[string, MetadataValue]>,
    ): string | undefined {
      for (let supportedToken of supportedTokens) {
        const image = supportedToken.tokenMetadataToImage?.(metadata);
        if (image) {
          return image;
        }
      }
    },

    tokenMetadataToUrl(
      metadata: Array<[string, MetadataValue]>,
    ): string | undefined {
      for (let supportedToken of supportedTokens) {
        const url = supportedToken.tokenMetadataToUrl?.(metadata);
        if (url) {
          return url;
        }
      }
    },

    tokenMetadataToAttributes(
      metadata: Array<[string, MetadataValue]>,
    ): Attribute[] | undefined {
      for (let supportedToken of supportedTokens) {
        const attributes = supportedToken.tokenMetadataToAttributes?.(metadata);
        if (attributes) {
          return attributes;
        }
      }
    },
  };

  return new Proxy(tokensWrapper as any, {
    get: (target, prop, receiver) => {
      supportedTokenInstances.forEach((token) => {
        if (prop in token) {
          const method = token[prop as keyof InstanceType<TokenImplementation>];
          return method?.bind(token);
        }
      });
      return Reflect.get(target, prop, receiver);
    },
  });
};
