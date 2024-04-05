import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./dip20/dip20.did";
import { idlFactory } from "./dip20";
import {
  IdentifiedCall,
  principalFromString,
  TokenManagerConfig,
} from "../index";
import { BaseToken, Token } from "./token";
import { Principal } from "@dfinity/principal";
import { Value } from "./icrc1/icrc1.did";

export const DIP20 = "dip20";

export type DIP20_TYPE = typeof DIP20;

export type Dip20Methods<T extends string | undefined = undefined> =
  T extends typeof DIP20
    ? Pick<
        Token,
        | "metadata"
        | "name"
        | "symbol"
        | "decimals"
        | "fee"
        | "totalSupply"
        | "mintingAccount"
        | "balanceOf"
        | "transfer"
        | "logo"
        | "approve"
        | "transferFrom"
        | "allowance"
      >
    : {};

export class Dip20Token extends BaseToken implements Partial<Token> {
  static implementedStandards = [DIP20] as const;
  static accountType = "principal" as const;

  private _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig<string>) {
    super({ supportedStandards, ...actorConfig });
    this._actor = Dip20Token.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(DIP20)) {
      this.metadata = undefined;
      this.name = undefined;
      this.symbol = undefined;
      this.decimals = undefined;
      this.fee = undefined;
      this.totalSupply = undefined;
      this.mintingAccount = undefined;
      this.balanceOf = undefined;
      this.transfer = undefined;
      this.logo = undefined;
      this.approve = undefined;
      this.transferFrom = undefined;
      this.allowance = undefined;
    }
  }

  static create<T extends string>(config: TokenManagerConfig<T>) {
    return new Dip20Token(config) as unknown as BaseToken & Dip20Methods<T>;
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>> {
    const actor = this.createActor(config);
    try {
      // There's no supported interfaces method,
      // so we have to rely on some runtime checks
      const metadata = (await actor.getMetadata()) as unknown;
      if (
        !metadata ||
        typeof metadata !== "object" ||
        !("fee" in metadata) ||
        !("decimals" in metadata) ||
        !("owner" in metadata) ||
        !("logo" in metadata) ||
        !("name" in metadata) ||
        !("totalSupply" in metadata) ||
        !("symbol" in metadata) ||
        typeof metadata.fee !== "bigint" ||
        typeof metadata.decimals !== "number" ||
        !metadata.owner ||
        typeof metadata.owner !== "object" ||
        !("_isPrincipal" in metadata.owner) ||
        !metadata.owner._isPrincipal ||
        typeof metadata.logo !== "string" ||
        typeof metadata.name !== "string" ||
        typeof metadata.totalSupply !== "bigint" ||
        typeof metadata.symbol !== "string"
      ) {
        // First we check if the metadata is missing data that we expect in DIP20
        return [];
      }
      const allowance = (await actor.allowance(
        // These addresses are random, allowance should always be 0 for them
        Principal.fromText(
          "s7l4m-kbynv-wmpuo-li4xn-vlotx-ulyj6-afz7m-npdis-ajee4-xx5jj-tae"
        ),
        Principal.fromText(
          "kk4n5-atwef-77o6m-mour6-pzmjs-qyjwn-pwo7q-75u2d-plgjc-sefao-pae"
        )
      )) as unknown;
      if (typeof allowance !== "bigint" || allowance !== BigInt(0)) {
        // Secondly we check if the allowance doesn't return the data we expect in DIP20
        return [];
      }
      // We're far from certain it's DIP20 at this point, a PR with additional checks is welcome
      return [{ name: DIP20, url: "https://github.com/Psychedelic/DIP20" }];
    } catch (_) {
      // Lastly if any of the above threw an error, it's not DIP20 either
      return [];
    }
  }

  static tokenType() {
    return "fungible" as const;
  }

  static identifyCall(
    methodName: string,
    args: any[]
  ): IdentifiedCall | undefined {
    if (methodName === "transfer") {
      return {
        methodName: "transfer",
        args: [
          {
            to: args[0].toText(),
            amount: args[1],
          },
        ],
      };
    }
  }

  async metadata?() {
    const metadata = await this._actor.getMetadata();
    const metadataEntries: Array<[string, Value]> = [
      [`${DIP20}:fee`, { Nat: metadata.fee }],
      [`${DIP20}:decimals`, { Nat: BigInt(metadata.decimals) }],
      [`${DIP20}:owner`, { Text: metadata.owner.toText() }],
      [`${DIP20}:logo`, { Text: metadata.logo }],
      [`${DIP20}:name`, { Text: metadata.name }],
      [`${DIP20}:totalSupply`, { Nat: metadata.totalSupply }],
      [`${DIP20}:symbol`, { Text: metadata.symbol }],
    ];
    return metadataEntries;
  }

  async name?() {
    return this._actor.name();
  }

  async symbol?() {
    return this._actor.symbol();
  }

  async decimals?() {
    return this._actor.decimals();
  }

  async fee?() {
    return (await this._actor.getMetadata()).fee;
  }

  async totalSupply?() {
    return this._actor.totalSupply();
  }

  async mintingAccount?() {
    const metadata = await this._actor.getMetadata();
    return metadata.owner.toText();
  }

  async balanceOf?(account: string) {
    return this._actor.balanceOf(principalFromString(account));
  }

  async transfer?(args: { to: string; amount: bigint }): Promise<bigint> {
    const res = await this._actor.transfer(
      principalFromString(args.to),
      args.amount
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async logo?() {
    return this._actor.logo();
  }

  async approve?(args: { spender: string; amount: bigint }) {
    const res = await this._actor.approve(
      principalFromString(args.spender),
      args.amount
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async transferFrom?(args: { from: string; to: string; amount: bigint }) {
    const res = await this._actor.transferFrom(
      principalFromString(args.from),
      principalFromString(args.to),
      args.amount
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async allowance?(args: { account: string; spender: string }) {
    return {
      allowance: await this._actor.allowance(
        principalFromString(args.account),
        principalFromString(args.spender)
      ),
    };
  }
}
