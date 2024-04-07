import {
  type CommonTokenMethods,
  type CreateActor,
  createCandidDecoder,
  decodeAccount,
  type DecodeCall,
  type ImplementedStandards,
  type MetadataValue,
  type NonFungibleTokenMethods,
  type SupportedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";
import { genericValueToMetadataValue } from "./utils";

type Methods = Pick<
  CommonTokenMethods,
  "metadata" | "name" | "symbol" | "logo" | "totalSupply" | "balanceOf"
> &
  Pick<
    NonFungibleTokenMethods,
    "tokenMetadata" | "ownerOf" | "tokens" | "tokensOf" | "transferToken"
  >;

export const Dip721V2 = class implements Methods {
  static implementedStandards = ["DIP-721-V2"] as const;

  readonly #config: TokenConfig;
  readonly #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Dip721V2.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(config: ActorConfig) {
    const supportedInterfaces = await this.createActor(config)
      .dip721_supported_interfaces()
      .catch(() => false);

    if (!Array.isArray(supportedInterfaces)) {
      return [];
    }

    return [
      { name: "DIP-721-V2", url: "https://github.com/Psychedelic/DIP721" },
    ];
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "dip721_metadata":
          return { method: "metadata", args: [] };
        case "dip721_symbol":
          return { method: "symbol", args: [] };
        case "dip721_logo":
          return { method: "logo", args: [] };
        case "dip721_total_supply":
          return { method: "totalSupply", args: [] };
        case "dip721_balance_of": {
          const [account] = decodeArgs("dip721_balance_of", args);
          return { method: "balanceOf", args: [account.toText()] };
        }
        case "dip721_token_metadata": {
          const [tokenId] = decodeArgs("dip721_token_metadata", args);
          return { method: "tokenMetadata", args: [tokenId] };
        }
        case "dip721_owner_of": {
          const [tokenId] = decodeArgs("dip721_owner_of", args);
          return { method: "ownerOf", args: [tokenId] };
        }
        case "dip721_owner_token_metadata": {
          const [account] = decodeArgs("dip721_owner_token_metadata", args);
          return { method: "tokensOf", args: [account.toText()] };
        }
        case "dip721_transfer": {
          const [to, tokenId] = decodeArgs("dip721_transfer", args);
          return {
            method: "transferToken",
            args: [{ to: to.toText(), tokenId }],
          };
        }
      }
    } catch {}
  }

  async metadata(): Promise<Array<[string, MetadataValue]>> {
    const metadata = await this.#actor.dip721_metadata.withOptions({
      agent: this.#config.queryAgent,
    })();
    return [
      ...metadata.name.map<[string, MetadataValue]>((name) => [
        "dip721v2:name",
        { Text: name },
      ]),
      ...metadata.symbol.map<[string, MetadataValue]>((symbol) => [
        "dip721v2:symbol",
        { Text: symbol },
      ]),
      ...metadata.logo.map<[string, MetadataValue]>((logo) => [
        "dip721v2:logo",
        { Text: logo },
      ]),
      ["dip721v2:created_at", { Nat: metadata.created_at }],
      ["dip721v2:upgraded_at", { Nat: metadata.upgraded_at }],
      [
        "dip721v2:custodians",
        {
          Array: metadata.custodians.map((custodian) => ({
            Text: custodian.toText(),
          })),
        },
      ],
    ];
  }

  async name(): Promise<string> {
    const name = await this.#actor.dip721_name.withOptions({
      agent: this.#config.queryAgent,
    })();
    return name[0] ?? "Unknown";
  }

  async symbol(): Promise<string> {
    const symbol = await this.#actor.dip721_symbol.withOptions({
      agent: this.#config.queryAgent,
    })();
    return symbol[0] ?? "NFT";
  }

  async logo(): Promise<string | undefined> {
    const logo = await this.#actor.dip721_logo.withOptions({
      agent: this.#config.queryAgent,
    })();
    return logo[0];
  }

  async totalSupply(): Promise<bigint> {
    return this.#actor.dip721_total_supply.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async balanceOf(account: string): Promise<bigint> {
    const res = await this.#actor.dip721_balance_of.withOptions({
      agent: this.#config.queryAgent,
    })(decodeAccount(account).owner);
    if ("Err" in res) {
      return BigInt(0);
    }

    return res.Ok;
  }

  async tokenMetadata(
    tokenId: bigint,
  ): Promise<Array<[string, MetadataValue]> | undefined> {
    const res = await this.#actor.dip721_token_metadata.withOptions({
      agent: this.#config.queryAgent,
    })(tokenId);
    if ("Err" in res) {
      return;
    }

    return [
      ...res.Ok.transferred_at.map<[string, MetadataValue]>((at) => [
        "dip721v2:transferred_at",
        { Nat: at },
      ]),
      ...res.Ok.transferred_by.map<[string, MetadataValue]>((by) => [
        "dip721v2:transferred_by",
        { Text: by.toText() },
      ]),
      ...res.Ok.owner.map<[string, MetadataValue]>((owner) => [
        "dip721v2:owner",
        { Text: owner.toText() },
      ]),
      ...res.Ok.owner.map<[string, MetadataValue]>((operator) => [
        "dip721v2:operator",
        { Text: operator.toText() },
      ]),
      ...res.Ok.approved_at.map<[string, MetadataValue]>((at) => [
        "dip721v2:approved_at",
        { Nat: at },
      ]),
      ...res.Ok.approved_by.map<[string, MetadataValue]>((by) => [
        "dip721v2:approved_by",
        { Text: by.toText() },
      ]),
      ["dip721v2:is_burned", { Nat: BigInt(res.Ok.is_burned ? 1 : 0) }],
      ["dip721v2:token_identifier", { Nat: res.Ok.token_identifier }],
      ...res.Ok.burned_at.map<[string, MetadataValue]>((at) => [
        "dip721v2:burned_at",
        { Nat: at },
      ]),
      ...res.Ok.burned_by.map<[string, MetadataValue]>((by) => [
        "dip721v2:burned_by",
        { Text: by.toText() },
      ]),
      ["dip721v2:minted_at", { Nat: res.Ok.minted_at }],
      ["dip721v2:minted_by", { Text: res.Ok.minted_by.toText() }],

      [
        `dip721v2:properties`,
        {
          Map: res.Ok.properties.map(([key, val]) => [
            key,
            genericValueToMetadataValue(val),
          ]),
        },
      ],
    ];
  }

  async ownerOf(tokenId: bigint): Promise<string | undefined> {
    const res = await this.#actor.dip721_owner_of.withOptions({
      agent: this.#config.queryAgent,
    })(tokenId);
    if ("Err" in res) {
      return;
    }
    return res.Ok[0]?.toText();
  }

  async tokens(prev?: bigint, take?: bigint): Promise<bigint[]> {
    // Get all tokens based on total supply, this does include burned tokens
    const totalSupply = (await this.totalSupply?.()) ?? BigInt(0);
    const tokenIds = Array.from({ length: Number(totalSupply) }).map(
      (_, index) => BigInt(index),
    );
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
    const res = await this.#actor.dip721_owner_token_metadata.withOptions({
      agent: this.#config.queryAgent,
    })(decodeAccount(account).owner);
    const tokenIds =
      "Ok" in res
        ? res.Ok.map((tokenMetadata) => tokenMetadata.token_identifier).sort(
            (a, b) => (a > b ? 1 : a < b ? -1 : 0),
          )
        : [];
    if (prev !== undefined && tokenIds.indexOf(prev) === -1) {
      return [];
    }
    const prevIndex = prev === undefined ? 0 : tokenIds.indexOf(prev) + 1;
    const takeCount = take === undefined ? undefined : Number(take);
    return tokenIds.slice(prevIndex, takeCount);
  }

  async transferToken(args: { tokenId: bigint; to: string }): Promise<bigint> {
    const from = await this.#config.agent?.getPrincipal();
    if (!from) {
      throw Error("Agent with principal is required");
    }
    const res = await this.#actor.dip721_transfer(
      decodeAccount(args.to).owner,
      args.tokenId,
    );
    if ("Err" in res) {
      throw Error(JSON.stringify(res.Err));
    }
    return res.Ok;
  }
} satisfies SupportedStandards &
  ImplementedStandards &
  CreateActor<_SERVICE> &
  DecodeCall<Methods>;
