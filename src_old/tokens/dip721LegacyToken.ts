import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./dip721Legacy/dip721Legacy.did";
import { idlFactory } from "./dip721Legacy";
import { principalFromString } from "../utils";
import { IdentifiedCall, TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import { Value } from "./icrc1/icrc1.did";

export const DIP721_LEGACY = "dip721_legacy";
export const DIP721_LEGACY_MINT = "dip721_legacy_mint";
export const DIP721_LEGACY_BURN = "dip721_legacy_burn";
export const DIP721_LEGACY_APPROVAL = "dip721_legacy_approval";
export const DIP721_LEGACY_TRANSACTION_HISTORY =
  "DIP721_LEGACY_TRANSACTION_HISTORY";
export const DIP721_LEGACY_TRANSFER_NOTIFICATION =
  "DIP721_LEGACY_TRANSFER_NOTIFICATION";

export type DIP721_LEGACY_TYPE =
  | typeof DIP721_LEGACY
  | typeof DIP721_LEGACY_MINT
  | typeof DIP721_LEGACY_BURN
  | typeof DIP721_LEGACY_APPROVAL
  | typeof DIP721_LEGACY_TRANSACTION_HISTORY
  | typeof DIP721_LEGACY_TRANSFER_NOTIFICATION;

export type Dip721LegacyMethods<T extends string | undefined = undefined> =
  (T extends typeof DIP721_LEGACY
    ? Pick<
        Token,
        | "metadata"
        | "name"
        | "symbol"
        | "totalSupply"
        | "mintingAccount"
        | "balanceOf"
        | "ownerOf"
        | "tokens"
        | "tokensOf"
        | "transfer"
        | "logo"
      >
    : {}) &
    (T extends typeof DIP721_LEGACY_APPROVAL
      ? Pick<Token, "approve" | "transferFrom">
      : {});

export class Dip721LegacyToken extends BaseToken implements Partial<Token> {
  static implementedStandards = [
    DIP721_LEGACY,
    DIP721_LEGACY_MINT,
    DIP721_LEGACY_BURN,
    DIP721_LEGACY_APPROVAL,
  ] as const;
  static accountType = "principal" as const;

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig<string>) {
    super({ supportedStandards, ...actorConfig });
    this._actor = Dip721LegacyToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(DIP721_LEGACY)) {
      this.metadata = undefined;
      this.name = undefined;
      this.symbol = undefined;
      this.totalSupply = undefined;
      this.mintingAccount = undefined;
      this.balanceOf = undefined;
      this.ownerOf = undefined;
      this.tokens = undefined;
      this.tokensOf = undefined;
      this.transfer = undefined;
      this.logo = undefined;
    }
    if (!supportedStandards.includes(DIP721_LEGACY_APPROVAL)) {
      this.approve = undefined;
      this.transferFrom = undefined;
    }
  }

  static create<T extends string>(config: TokenManagerConfig<T>) {
    return new Dip721LegacyToken(config) as unknown as BaseToken &
      Dip721LegacyMethods<T>;
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>> {
    try {
      const res = await Actor.createActor<_SERVICE>(
        idlFactory,
        config
      ).supportedInterfacesDip721();
      return [
        DIP721_LEGACY,
        ...res.map((supportedInterface) =>
          "Mint" in supportedInterface
            ? DIP721_LEGACY_MINT
            : "Burn" in supportedInterface
            ? DIP721_LEGACY_BURN
            : "Approval" in supportedInterface
            ? DIP721_LEGACY_APPROVAL
            : "TransactionHistory" in supportedInterface
            ? DIP721_LEGACY_TRANSACTION_HISTORY
            : DIP721_LEGACY_TRANSFER_NOTIFICATION
        ),
      ].map((name) => ({
        name,
        url: "https://github.com/Psychedelic/DIP721",
      }));
    } catch (_) {
      return [];
    }
  }

  static tokenType() {
    return "nonFungible" as const;
  }

  static identifyCall(
    methodName: string,
    args: any[]
  ): IdentifiedCall | undefined {
    return;
  }

  async metadata?() {
    return [
      [`${DIP721_LEGACY}:name`, { Text: await this.name!() }],
      [`${DIP721_LEGACY}:symbol`, { Text: await this.symbol!() }],
      [`${DIP721_LEGACY}:total_supply`, { Nat: await this.totalSupply!() }],
    ] as Array<[string, Value]>;
  }

  async name?() {
    return (
      (await this._actor.nameDip721().catch(() => undefined)) ??
      (await this._actor.name())
    );
  }

  async symbol?() {
    return this._actor.symbolDip721();
  }

  async totalSupply?() {
    return this._actor.totalSupplyDip721();
  }

  async mintingAccount?() {
    const canisterId = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!canisterId) {
      throw Error("Agent with principal is required");
    }
    return canisterId.toText();
  }

  async balanceOf?(account: string) {
    return this._actor.balanceOfDip721(principalFromString(account));
  }

  async ownerOf?(tokenId: bigint) {
    const res = await this._actor.ownerOfDip721(tokenId);
    return "Ok" in res ? res.Ok.toText() : undefined;
  }

  async tokens?() {
    // Get all tokens based on total supply, this does include burned tokens
    const totalSupply = (await this.totalSupply?.()) ?? BigInt(0);
    return Array.from({ length: Number(totalSupply) }).map((_, index) =>
      BigInt(index)
    );
  }

  async tokensOf?(account: string) {
    return this._actor.getTokenIdsForUserDip721(principalFromString(account));
  }

  async metadataOf?(tokenId: bigint) {
    const res = await this._actor.getMetadataDip721(tokenId);
    return "Ok" in res
      ? (res.Ok.map((part) => {
          const purpose = "Preview" in part.purpose ? "preview" : "rendered";
          return [
            [purpose, { Blob: part.data }],
            ...part.key_val_data.map(({ key, val }) => [
              `${purpose}:${key}`,

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
          ];
        }).flat() as Array<[string, Value]>)
      : undefined;
  }

  async transfer?(args: { to: string; tokenId: bigint }): Promise<bigint> {
    const from = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!from) {
      throw Error("Agent with principal is required");
    }
    const res = await this._actor.transferFromDip721(
      from,
      principalFromString(args.to),
      args.tokenId
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async approve?(args: {
    spender: string;
    tokenId: bigint;
    approved: boolean;
  }): Promise<bigint> {
    // Set approval to canister id when approval should be revoked
    const canisterId = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!canisterId) {
      throw Error("Agent with principal is required");
    }
    const res = await this._actor.approveDip721(
      args.approved ? principalFromString(args.spender) : canisterId,
      args.tokenId
    );
    if ("Ok" in res) {
      return BigInt(0);
    }
    throw Error(JSON.stringify(res.Err));
  }

  async transferFrom?(args: {
    from: string;
    to: string;
    tokenId: bigint;
  }): Promise<bigint> {
    const res = await this._actor.transferFromDip721(
      principalFromString(args.from),
      principalFromString(args.to),
      args.tokenId
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async logo?() {
    return (await this._actor.logoDip721()).data;
  }
}
