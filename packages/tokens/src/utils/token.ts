import type {
  CommonTokenBatchMethods,
  CommonTokenMethods,
  DecodeCall,
  FungibleTokenBatchMethods,
  FungibleTokenMethods,
  ImplementedStandards,
  NonFungibleTokenBatchMethods,
  NonFungibleTokenMethods,
  SupportedStandards,
  SupportedStandardsWithoutConfig,
} from "../types";
import type { ActorConfig, Agent } from "@dfinity/agent";

export type TokenConfig = ActorConfig & {
  queryAgent?: Agent;
};

type TokenImplementation = SupportedStandards &
  ImplementedStandards &
  Partial<DecodeCall<any>> &
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

export const createToken = <
  Tokens extends TokenImplementation,
  Config extends TokenConfig & {
    supportedStandards?: string[] | readonly string[];
  },
  Wrapper = (Config["supportedStandards"] extends string[]
    ? Partial<InstanceType<Tokens>>
    : Config["supportedStandards"] extends readonly string[]
      ? InstanceType<SupportedTokens<Tokens, Config["supportedStandards"]>>
      : Partial<InstanceType<Tokens>>) &
    SupportedStandardsWithoutConfig &
    ImplementedStandards &
    (Tokens extends DecodeCall<any>
      ? Pick<Tokens, "decodeCall">
      : DecodeCall<unknown>),
  PossiblyPromise = Config["supportedStandards"] extends
    | string[]
    | readonly string[]
    ? Wrapper
    : Promise<Wrapper>,
>(
  tokens: Tokens[],
  config: Config,
): PossiblyPromise => {
  if (!config.supportedStandards) {
    return Promise.all(
      tokens.map((token) =>
        token.supportedStandards({
          ...config,
          agent: config.queryAgent ?? config.agent,
        }),
      ),
    )
      .then((supportedStandards) =>
        supportedStandards.flat().map(({ name }) => name),
      )
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
    DecodeCall<any> = {
    implementedStandards: config.supportedStandards,

    async supportedStandards(): Promise<Array<{ name: string; url: string }>> {
      return (
        await Promise.all(
          tokens.map((token) => token.supportedStandards(config)),
        )
      ).flat();
    },

    decodeCall(method: string, args: ArrayBuffer) {
      supportedTokens.forEach((token) => {
        const decoded = token.decodeCall?.(method, args);
        if (decoded) {
          return decoded;
        }
      });
      return undefined;
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
