import {
  type CommonTokenMethods,
  type CreateActor,
  createCandidDecoder,
  decodeAccount,
  type DecodeCall,
  type FungibleTokenMethods,
  type ImplementedStandards,
  type MetadataValue,
  type SupportedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";
import { isValidMetadata } from "./utils";

type Methods = Pick<
  CommonTokenMethods,
  "metadata" | "name" | "symbol" | "logo" | "totalSupply" | "balanceOf"
> &
  Pick<
    FungibleTokenMethods,
    "decimals" | "fee" | "mintingAccount" | "transfer"
  >;

export const Dip20 = class implements Methods {
  static implementedStandards = ["DIP-20"] as const;

  readonly #config: TokenConfig;
  readonly #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Dip20.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(config: ActorConfig) {
    // There's no supported standards method,
    // so we have to rely on some runtime checks.
    const actor = this.createActor(config);

    // First we check if the metadata is returned and valid
    const metadata = await actor.getMetadata().catch(() => false);
    if (!isValidMetadata(metadata)) {
      return [];
    }

    // Secondly we check if the allowance is returned and 0 between random Principals.
    //
    // The chance that someone can break this by finding the private keys for these principals
    // and changing the allowance to a value different from the expected value is non-existent.
    const allowance = await actor
      .allowance(
        Principal.fromText(
          "s7l4m-kbynv-wmpuo-li4xn-vlotx-ulyj6-afz7m-npdis-ajee4-xx5jj-tae",
        ),
        Principal.fromText(
          "kk4n5-atwef-77o6m-mour6-pzmjs-qyjwn-pwo7q-75u2d-plgjc-sefao-pae",
        ),
      )
      .catch(() => false);

    if (typeof allowance !== "bigint" || allowance !== BigInt(0)) {
      return [];
    }

    return [{ name: "DIP-20", url: "https://github.com/Psychedelic/DIP20" }];
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "getMetadata":
          return { method: "metadata", args: [] };
        case "name":
          return { method: "name", args: [] };
        case "symbol":
          return { method: "symbol", args: [] };
        case "logo":
          return { method: "logo", args: [] };
        case "totalSupply":
          return { method: "totalSupply", args: [] };
        case "balanceOf": {
          const [account] = decodeArgs("balanceOf", args);
          return {
            method: "balanceOf",
            args: [Principal.from(account).toText()],
          };
        }
        case "decimals":
          return {
            method: "decimals",
            args: [],
          };
        case "transfer": {
          const [to, amount] = decodeArgs("transfer", args);
          return {
            method: "transfer",
            args: [
              {
                to: Principal.from(to).toText(),
                amount,
              },
            ],
          };
        }
      }
    } catch {}
  }

  async metadata(): Promise<[string, MetadataValue][]> {
    const metadata = await this.#actor.getMetadata.withOptions({
      agent: this.#config.queryAgent,
    })();
    return [
      ["dip20:fee", { Nat: metadata.fee }],
      ["dip20:decimals", { Nat: BigInt(metadata.decimals) }],
      ["dip20:owner", { Text: metadata.owner.toText() }],
      ["dip20:logo", { Text: metadata.logo }],
      ["dip20:name", { Text: metadata.name }],
      ["dip20:totalSupply", { Nat: metadata.totalSupply }],
      ["dip20:symbol", { Text: metadata.symbol }],
    ];
  }

  async name(): Promise<string> {
    return this.#actor.name.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async symbol(): Promise<string> {
    return this.#actor.symbol.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async logo(): Promise<string | undefined> {
    return this.#actor.logo.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async totalSupply(): Promise<bigint> {
    return this.#actor.totalSupply.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async balanceOf(account: string): Promise<bigint> {
    return this.#actor.balanceOf.withOptions({
      agent: this.#config.queryAgent,
    })(decodeAccount(account).owner);
  }

  async decimals(): Promise<number> {
    return this.#actor.decimals.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async fee(): Promise<bigint> {
    return BigInt(0);
  }

  async mintingAccount(): Promise<string | undefined> {
    const metadata = await this.#actor.getMetadata();
    return metadata.owner.toText();
  }

  async transfer(args: { amount: bigint; to: string }): Promise<bigint> {
    const res = await this.#actor.transfer(
      decodeAccount(args.to).owner,
      args.amount,
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
