import {
  type CommonTokenMethods,
  type CreateActor,
  decodeAccount,
  type DecodeCall,
  type ImplementedStandards,
  type MetadataValue,
  type SupportedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";
import { Principal } from "@dfinity/principal";
import { getCollections, urlIsImage } from "./utils";

type Methods = Pick<
  CommonTokenMethods,
  | "metadata"
  | "name"
  | "symbol"
  | "logo"
  | "totalSupply"
  | "maxMemoSize"
  | "balanceOf"
>;

export const ExtCommon = class implements Methods {
  static implementedStandards = ["@ext/common"] as const;

  #config: TokenConfig;
  #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = ExtCommon.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(config: ActorConfig) {
    const standards = await this.createActor(config)
      .extensions()
      .catch(() => []);
    return standards.map((name) => ({
      name,
      url: "https://github.com/Toniq-Labs/extendable-token",
    }));
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    return;
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
      ["@ext/common:total_supply", { Text: totalSupply }],
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

  async maxMemoSize(): Promise<number> {
    // TODO: Unknown, below is "probably" a safe value
    return 32;
  }

  async balanceOf(account: string): Promise<bigint> {
    const standards = await ExtCommon.supportedStandards({
      ...this.#config,
      agent: this.#config.queryAgent,
    });
    const of = decodeAccount(account);
    return this.#actor.balance.withOptions({
      agent: this.#config.queryAgent,
    })({
      owner: of.owner,
      subaccount: of.subaccount ? [new Uint8Array(of.subaccount)] : [],
    });
  }
} satisfies SupportedStandards &
  ImplementedStandards &
  CreateActor<_SERVICE> &
  DecodeCall<Methods>;
