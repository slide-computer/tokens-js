import {
  type Attribute,
  type CommonTokenMethods,
  type CreateActor,
  createCandidDecoder,
  decodeAccount,
  type DecodeCall,
  hashAccount,
  type ImplementedStandards,
  isAccountHash,
  type MetadataValue,
  metadataValueToJsonValue,
  type NonFungibleTokenMethods,
  type SupportedStandards,
  type TokenConfig,
  type TokenMetadataToAttributes,
  type TokenMetadataToImage,
  type TokenMetadataToUrl,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";
import { Principal } from "@dfinity/principal";
import {
  filtersToTokenAttributes,
  getCollectionFilters,
  getCollections,
  tokenIdToIndex,
  tokenIndexToId,
  urlIsImage,
} from "./utils";

type Methods = Pick<
  CommonTokenMethods,
  "metadata" | "name" | "symbol" | "logo" | "totalSupply" | "balanceOf"
> &
  Pick<
    NonFungibleTokenMethods,
    "tokenMetadata" | "ownerOf" | "tokens" | "tokensOf" | "transferToken"
  >;

export const Ext = class implements Methods {
  static implementedStandards = ["@ext/common", "@ext/nonfungible"] as const;

  readonly #config: TokenConfig;
  readonly #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Ext.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
    config: ActorConfig,
  ): Promise<Array<{ name: string; url: string }>> {
    const standards = await this.createActor(config)
      .extensions()
      .catch(() => [] as string[]);
    if (
      standards.includes("@ext/common") &&
      standards.includes("@ext/nonfungible")
    ) {
      return [
        {
          name: "@ext/common",
          url: "https://github.com/Toniq-Labs/extendable-token",
        },
        {
          name: "@ext/nonfungible",
          url: "https://github.com/Toniq-Labs/extendable-token",
        },
      ];
    }
    return [];
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "getTokens":
          return {
            method: "tokens",
            args: [],
          };
        case "tokens": {
          const [account] = decodeArgs("tokens", args);
          return {
            method: "tokensOf",
            args: [account],
          };
        }
        case "transfer": {
          const [transferRequest] = decodeArgs("transfer", args);
          return {
            method: "transferToken",
            args: [
              {
                tokenId: tokenIdToIndex(
                  Principal.fromText(transferRequest.token),
                ),
                fromSubaccount: transferRequest.subaccount[0]?.buffer,
                to:
                  "address" in transferRequest.to
                    ? transferRequest.to.address
                    : Principal.from(transferRequest.to.principal).toText(),
                memo: transferRequest.memo,
              },
            ],
          };
        }
      }
    } catch {}
  }

  static tokenMetadataToImage(
    metadata: Array<[string, MetadataValue]>,
  ): string | undefined {
    const image = metadata.find(([key]) => key === "@ext/nonfungible:image");
    if (!image || !("Text" in image[1])) {
      return;
    }
    return image[1].Text;
  }

  static tokenMetadataToUrl(
    metadata: Array<[string, MetadataValue]>,
  ): string | undefined {
    const url = metadata.find(([key]) => key === "@ext/nonfungible:url");
    if (!url || !("Text" in url[1])) {
      return;
    }
    return url[1].Text;
  }

  static tokenMetadataToAttributes(
    metadata: Array<[string, MetadataValue]>,
  ): Attribute[] | undefined {
    const attributes = metadata.find(
      ([key]) => key === "@ext/nonfungible:attributes",
    );
    if (!attributes || !("Map" in attributes[1])) {
      return;
    }
    return attributes[1].Map.map(([key, value]) => ({
      value: metadataValueToJsonValue(value),
      traitType: key,
    }));
  }

  async metadata(): Promise<[string, MetadataValue][]> {
    const [name, symbol, totalSupply] = await Promise.all([
      this.name(),
      this.symbol(),
      this.totalSupply(),
    ]);
    return [
      ["@ext/common:name", { Text: name }],
      ["@ext/common:symbol", { Text: symbol }],
      ["@ext/common:total_supply", { Nat: totalSupply }],
    ] as Array<[string, MetadataValue]>;
  }

  async name(): Promise<string> {
    const canisterId = Principal.from(this.#config.canisterId).toText();

    // Exceptions that do not return a correct name
    switch (canisterId) {
      case "oeee4-qaaaa-aaaak-qaaeq-cai":
        return "Motoko Ghosts";
      case "bzsui-sqaaa-aaaah-qce2a-cai":
        return "Poked Bots";
      case "dhiaa-ryaaa-aaaae-qabva-cai":
        return "ETH Flower";
    }

    // Grab collection name from index page with regex since the canister has no name or metadata method
    const res = await this.#actor.http_request.withOptions({
      agent: this.#config.queryAgent,
    })({
      body: new Uint8Array(),
      headers: [],
      method: "GET",
      url: "/",
    });
    if (res.status_code === 200) {
      const body = new TextDecoder().decode(res.body);
      const matches = /^(.+?)\n(?:EXT by|---)/.exec(body);
      if (matches?.[1]) {
        return matches[1];
      }
    }

    // Above might not always work since it's a hacky workaround at best,
    // this second attempt we check if the entrepot backend might contain the name
    const collections = await getCollections().catch(() => []);
    const collection = collections.find(({ id }) => id === canisterId);
    return collection?.name ?? "Unknown";
  }

  async symbol(): Promise<string> {
    // Check if the entrepot backend might contain the symbol
    const canisterId = Principal.from(this.#config.canisterId).toText();
    const collections = await getCollections().catch(() => []);
    const collection = collections.find(({ id }) => id === canisterId);
    return collection?.unit ?? "EXT";
  }

  async logo(): Promise<string | undefined> {
    // Check if the entrepot backend might contain the logo
    const canisterId = Principal.from(this.#config.canisterId).toText();
    const collections = await getCollections().catch(() => []);
    const collection = collections.find(({ id }) => id === canisterId);
    if (collection?.avatar) {
      if (
        collection.avatar.startsWith("https://") ||
        collection.avatar.startsWith("http://")
      ) {
        return collection.avatar;
      }
      return `https://entrepot.app${collection.avatar}`;
    }

    // Lastly we can check if the logo might be available at a common url
    const commonUrl = `https://entrepot.app/collections/${canisterId}.jpg`;
    if (await urlIsImage(commonUrl)) {
      return commonUrl;
    }
  }

  async totalSupply(): Promise<bigint> {
    const tokens = await this.#actor.getTokens.withOptions({
      agent: this.#config.queryAgent,
    })();
    return BigInt(tokens.length);
  }

  async balanceOf(account: string): Promise<bigint> {
    const accountHash = isAccountHash(account)
      ? account
      : hashAccount(decodeAccount(account));
    const res = await this.#actor.tokens.withOptions({
      agent: this.#config.queryAgent,
    })(accountHash);
    if ("err" in res) {
      return BigInt(0);
    }
    return BigInt(res.ok.length);
  }

  async tokenMetadata(
    tokenId: bigint,
  ): Promise<Array<[string, MetadataValue]> | undefined> {
    const canisterId = Principal.from(this.#config.canisterId);
    const url = `https://${canisterId.toText()}.raw.icp0.io/?tokenid=${tokenIndexToId(canisterId, tokenId)}`;
    const filters = await getCollectionFilters(canisterId);
    const attributes = filters && filtersToTokenAttributes(filters, tokenId);
    const metadata: Array<[string, MetadataValue]> = [
      ["@ext/nonfungible:image", { Text: url }],
      ["@ext/nonfungible:url", { Text: url }],
    ];
    if (attributes) {
      metadata.push(["@ext/nonfungible:attributes", attributes]);
    }
    return metadata;
  }

  async ownerOf(tokenId: bigint): Promise<string | undefined> {
    // Get registry with all tokens and owners and return owner for token
    const res = await this.#actor.getRegistry();
    return res.find(([id]) => id === Number(tokenId))?.[1];
  }

  async tokens(prev?: bigint, take?: bigint): Promise<bigint[]> {
    const tokens = await this.#actor.getTokens();
    const tokenIds = tokens
      .map(([tokenIndex]) => BigInt(tokenIndex))
      .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    if (prev !== undefined && tokenIds.indexOf(prev) === -1) {
      return [];
    }
    const prevIndex = prev === undefined ? 0 : tokenIds.indexOf(prev) + 1;
    const takeCount = take === undefined ? undefined : Number(take);
    return tokenIds.slice(prevIndex, takeCount);
  }

  async tokensOf(
    account: string,
    prev?: bigint,
    take?: bigint,
  ): Promise<bigint[]> {
    const accountHash = isAccountHash(account)
      ? account
      : hashAccount(decodeAccount(account));
    const res = await this.#actor.tokens(accountHash);
    if ("err" in res) {
      return [];
    }
    const tokenIds = res.ok
      .map((tokenIndex) => BigInt(tokenIndex))
      .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    if (prev !== undefined && tokenIds.indexOf(prev) === -1) {
      return [];
    }
    const prevIndex =
      prev === undefined ? undefined : tokenIds.indexOf(prev) + 1;
    const takeCount = take === undefined ? undefined : Number(take);
    return tokenIds.slice(prevIndex, takeCount);
  }

  async transferToken(args: {
    tokenId: bigint;
    fromSubaccount?: ArrayBuffer;
    to: string;
    memo?: ArrayBuffer;
  }): Promise<bigint> {
    const fromPrincipal = await this.#config.agent?.getPrincipal();
    if (!fromPrincipal) {
      throw Error("Agent with principal is required");
    }
    const from = hashAccount({
      owner: fromPrincipal,
      subaccount: args.fromSubaccount,
    });
    const to = isAccountHash(args.to)
      ? args.to
      : hashAccount(decodeAccount(args.to));
    const res = await this.#actor.transfer({
      amount: BigInt(1),
      from: {
        address: from,
      },
      memo: args.memo ? new Uint8Array(args.memo) : Uint8Array.from([0]),
      notify: false,
      subaccount: args.fromSubaccount
        ? [new Uint8Array(args.fromSubaccount)]
        : [],
      to: { address: to },
      token: tokenIndexToId(
        Principal.from(this.#config.canisterId),
        args.tokenId,
      ).toText(),
    });
    if ("err" in res) {
      throw Error(JSON.stringify(res.err));
    }
    return res.ok;
  }
} satisfies SupportedStandards &
  ImplementedStandards &
  CreateActor<_SERVICE> &
  DecodeCall<Methods> &
  TokenMetadataToImage &
  TokenMetadataToUrl &
  TokenMetadataToAttributes;
