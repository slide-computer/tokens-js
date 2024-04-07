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
import { Principal } from "@dfinity/principal";

type Methods = Pick<
  CommonTokenMethods,
  "name" | "symbol" | "logo" | "totalSupply" | "balanceOf"
> &
  Pick<
    NonFungibleTokenMethods,
    "tokenMetadata" | "ownerOf" | "tokens" | "tokensOf" | "transferToken"
  >;

export const Dip721V1 = class implements Methods {
  static implementedStandards = ["DIP-721-V1"] as const;

  readonly #config: TokenConfig;
  readonly #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Dip721V1.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(config: ActorConfig) {
    const supportedInterfaces = await this.createActor(config)
      .supportedInterfacesDip721()
      .catch(() => false);

    if (!Array.isArray(supportedInterfaces)) {
      return [];
    }

    return [
      { name: "DIP-721-V1", url: "https://github.com/Psychedelic/DIP721" },
    ];
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "nameDip721":
          return { method: "name", args: [] };
        case "symbolDip721":
          return { method: "symbol", args: [] };
        case "totalSupplyDip721":
          return { method: "totalSupply", args: [] };
        case "balanceOfDip721": {
          const [account] = decodeArgs("balanceOfDip721", args);
          return {
            method: "balanceOf",
            args: [Principal.from(account).toText()],
          };
        }
        case "getMetadataDip721": {
          const [tokenId] = decodeArgs("getMetadataDip721", args);
          return {
            method: "tokenMetadata",
            args: [tokenId],
          };
        }
        case "ownerOfDip721": {
          const [tokenId] = decodeArgs("ownerOfDip721", args);
          return {
            method: "ownerOf",
            args: [tokenId],
          };
        }
        case "getTokenIdsForUserDip721": {
          const [account] = decodeArgs("getTokenIdsForUserDip721", args);
          return {
            method: "tokensOf",
            args: [Principal.from(account).toText()],
          };
        }
        case "transferFromDip721": {
          const [, to, tokenId] = decodeArgs("transferFromDip721", args);
          return {
            method: "transferToken",
            args: [
              {
                to: Principal.from(to).toText(),
                tokenId,
              },
            ],
          };
        }
      }
    } catch {}
  }

  async name(): Promise<string> {
    return this.#actor.nameDip721.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async symbol(): Promise<string> {
    return this.#actor.symbolDip721.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async logo(): Promise<string | undefined> {
    const logo = await this.#actor.logoDip721.withOptions({
      agent: this.#config.queryAgent,
    })();
    return logo.data;
  }

  async totalSupply(): Promise<bigint> {
    return this.#actor.totalSupplyDip721.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async balanceOf(account: string): Promise<bigint> {
    return this.#actor.balanceOfDip721.withOptions({
      agent: this.#config.queryAgent,
    })(decodeAccount(account).owner);
  }

  async tokenMetadata(
    tokenId: bigint,
  ): Promise<Array<[string, MetadataValue]> | undefined> {
    const res = await this.#actor.getMetadataDip721.withOptions({
      agent: this.#config.queryAgent,
    })(tokenId);
    if ("Err" in res) {
      return;
    }

    return res.Ok.map((part) => {
      return [
        `dip721v1:${part.purpose}`,
        {
          Map: part.key_val_data.map(({ key, val }) => [
            key,
            "TextContent" in val
              ? { Text: val.TextContent }
              : "BlobContent" in val
                ? { Blob: val.BlobContent }
                : "Nat64Content" in val
                  ? { Nat: val["Nat64Content"] }
                  : "Nat32Content" in val
                    ? { Nat: BigInt(val["Nat32Content"]) }
                    : "Nat16Content" in val
                      ? { Nat: BigInt(val["Nat16Content"]) }
                      : "Nat8Content" in val
                        ? { Nat: BigInt(val["Nat8Content"]) }
                        : { Nat: val["NatContent"] },
          ]),
        },
      ];
    });
  }

  async ownerOf(tokenId: bigint): Promise<string | undefined> {
    const res = await this.#actor.ownerOfDip721.withOptions({
      agent: this.#config.queryAgent,
    })(tokenId);
    if ("Err" in res) {
      return;
    }
    return res.Ok.toText();
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
    const tokenIds = await this.#actor.getTokenIdsForUserDip721.withOptions({
      agent: this.#config.queryAgent,
    })(decodeAccount(account).owner);
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
    const res = await this.#actor.transferFromDip721(
      from,
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
