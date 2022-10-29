import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./dip721Legacy/dip721Legacy.did";
import { idlFactory } from "./dip721Legacy";
import { principalFromString } from "../utils";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token, Value } from "./token";
import { Principal } from "@dfinity/principal";

export const DIP721_LEGACY = "dip721_legacy";
export const DIP721_LEGACY_MINT = "dip721_legacy_mint";
export const DIP721_LEGACY_BURN = "dip721_legacy_burn";
export const DIP721_LEGACY_APPROVAL = "dip721_legacy_approval";
export const DIP721_LEGACY_TRANSACTION_HISTORY =
  "dip721_legacy_transaction_history";
export const DIP721_LEGACY_TRANSFER_NOTIFICATION =
  "dip721_legacy_transfer_notification";

export class Dip721LegacyToken extends BaseToken implements Partial<Token> {
  public static readonly implementedInterfaces = [
    DIP721_LEGACY,
    DIP721_LEGACY_MINT,
    DIP721_LEGACY_BURN,
    DIP721_LEGACY_APPROVAL,
  ];

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedInterfaces = [],
    ...actorConfig
  }: TokenManagerConfig) {
    super({ supportedInterfaces, ...actorConfig });
    this._actor = Dip721LegacyToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedInterfaces.includes(DIP721_LEGACY)) {
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
    }
    if (!supportedInterfaces.includes(DIP721_LEGACY_APPROVAL)) {
      this.approve = undefined;
      this.transferFrom = undefined;
    }
  }

  public static create<T extends string>(config: TokenManagerConfig<T>) {
    return new Dip721LegacyToken(config) as unknown as BaseToken &
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
          >
        : {}) &
      (T extends typeof DIP721_LEGACY_APPROVAL
        ? Pick<Token, "approve" | "transferFrom">
        : {});
  }

  public static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  public static async supportedInterfaces(
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

  public async metadata?(): Promise<{ [key: string]: Value }> {
    return {
      [[DIP721_LEGACY, "name"].join(":")]: { Text: await this.name!() },
      [[DIP721_LEGACY, "symbol"].join(":")]: { Text: await this.symbol!() },
      [[DIP721_LEGACY, "total_supply"].join(":")]: {
        Nat: await this.totalSupply!(),
      },
    };
  }

  public async name?() {
    return (
      (await this._actor.nameDip721().catch(() => undefined)) ??
      (await this._actor.name())
    );
  }

  public async symbol?() {
    return this._actor.symbolDip721();
  }

  public async totalSupply?() {
    return this._actor.totalSupplyDip721();
  }

  public async mintingAccount?() {
    const canisterId = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!canisterId) {
      throw Error("Agent with principal is required");
    }
    return canisterId.toText();
  }

  public async balanceOf?(account: string) {
    return this._actor.balanceOfDip721(principalFromString(account));
  }

  public async ownerOf?(tokenId: bigint) {
    const res = await this._actor.ownerOfDip721(tokenId);
    return "Ok" in res ? res.Ok.toText() : undefined;
  }

  public async tokens?() {
    // Get all tokens based on total supply, this does include burned tokens
    const totalSupply = (await this.totalSupply?.()) ?? BigInt(0);
    return Array.from({ length: Number(totalSupply) }).map((_, index) =>
      BigInt(index)
    );
  }

  public async tokensOf?(account: string) {
    return this._actor.getTokenIdsForUserDip721(principalFromString(account));
  }

  public async metadataOf?(tokenId: bigint) {
    const res = await this._actor.getMetadataDip721(tokenId);
    return "Ok" in res
      ? Object.fromEntries(
          res.Ok.map((part) => {
            const purpose = "Preview" in part.purpose ? "preview" : "rendered";
            return [
              [purpose, { Blob: part.data }],
              ...part.key_val_data.map(({ key, val }) => [
                [purpose, key].join(":"),
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
            ] as Array<[string, Value]>;
          }).flat()
        )
      : undefined;
  }

  public async transfer?(args: {
    to: string;
    tokenId: bigint;
  }): Promise<bigint> {
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

  public async approve?(args: {
    spender: Principal;
    tokenId: bigint;
    approved: boolean;
  }): Promise<bigint> {
    // Set approval to canister id when approval should be revoked
    const canisterId = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!canisterId) {
      throw Error("Agent with principal is required");
    }
    const res = await this._actor.approveDip721(
      args.approved ? args.spender : canisterId,
      args.tokenId
    );
    if ("Ok" in res) {
      return BigInt(0);
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async transferFrom?(args: {
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
}
