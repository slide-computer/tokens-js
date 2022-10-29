import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE, GenericValue } from "./dip721V2/dip721V2.did";
import { idlFactory } from "./dip721V2";
import { principalFromString } from "../utils";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import { Principal } from "@dfinity/principal";
import { Value } from "./sld/sld.did";

export const DIP721_V2 = "dip721_v2";
export const DIP721_V2_MINT = "dip721_v2_mint";
export const DIP721_V2_BURN = "dip721_v2_burn";
export const DIP721_V2_APPROVAL = "dip721_v2_approval";

const flattenMetadataEntry = ([key, value]: [string, GenericValue]): Array<
  [string, Value]
> => {
  const natValueKey = (
    [
      "NatContent",
      "Nat64Content",
      "Nat32Content",
      "Nat16Content",
      "Nat8Content",
    ] as Array<keyof GenericValue>
  ).find((k) => k in value);
  if (natValueKey) {
    return [[key, { Nat: BigInt(value[natValueKey]) }]];
  }
  const intValueKey = (
    [
      "IntContent",
      "Int64Content",
      "Int32Content",
      "Int16Content",
      "Int8Content",
    ] as Array<keyof GenericValue>
  ).find((k) => k in value);
  if (intValueKey) {
    return [[key, { Int: BigInt(value[intValueKey]) }]];
  }
  if ("FloatContent" in value) {
    return [[key, { Text: value.FloatContent.toString() }]];
  }
  if ("BoolContent" in value) {
    return [[key, { Nat: BigInt(value.BoolContent ? 1 : 0) }]];
  }
  if ("BlobContent" in value) {
    return [[key, { Blob: value.BlobContent }]];
  }
  if ("Principal" in value) {
    return [[key, { Text: value.Principal.toText() }]];
  }
  if ("TextContent" in value) {
    return [[key, { Text: value.TextContent }]];
  }
  if ("NestedContent" in value) {
    return value.NestedContent.map(([nestedKey, nestedValue]) =>
      flattenMetadataEntry([key + ":" + nestedKey, nestedValue])
    ).flat();
  }
  throw Error("DIP721 V2 metadata value could not be converted to value");
};

export class Dip721V2Token extends BaseToken implements Partial<Token> {
  public static readonly implementedInterfaces = [
    DIP721_V2,
    DIP721_V2_MINT,
    DIP721_V2_BURN,
    DIP721_V2_APPROVAL,
  ];

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedInterfaces = [],
    ...actorConfig
  }: TokenManagerConfig) {
    super({ supportedInterfaces, ...actorConfig });
    this._actor = Dip721V2Token.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedInterfaces.includes(DIP721_V2)) {
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
      this.getCustodians = undefined;
      this.setCustodian = undefined;
      this.logo = undefined;
    }
    if (!supportedInterfaces.includes(DIP721_V2_APPROVAL)) {
      this.approve = undefined;
      this.setApprovalForAll = undefined;
      this.isApprovedForAll = undefined;
      this.transferFrom = undefined;
    }
  }

  public static create<T extends string>(config: TokenManagerConfig<T>) {
    return new Dip721V2Token(config) as unknown as BaseToken &
      (T extends typeof DIP721_V2
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
            | "getCustodians"
            | "setCustodian"
            | "logo"
          >
        : {}) &
      (T extends typeof DIP721_V2_APPROVAL
        ? Pick<
            Token,
            | "approve"
            | "setApprovalForAll"
            | "isApprovedForAll"
            | "transferFrom"
          >
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
      ).dip721_supported_interfaces();
      return [
        DIP721_V2,
        ...res.map((supportedInterface) =>
          "Mint" in supportedInterface
            ? DIP721_V2_MINT
            : "Burn" in supportedInterface
            ? DIP721_V2_BURN
            : DIP721_V2_APPROVAL
        ),
      ].map((name) => ({
        name,
        url: "https://github.com/Psychedelic/DIP721",
      }));
    } catch (_) {
      return [];
    }
  }

  public async metadata?() {
    const res = await this._actor.dip721_metadata();
    const metadata: { [key: string]: Value } = {};
    if (res.name.length) {
      metadata[`${DIP721_V2}:name`] = { Text: res.name[0] };
    }
    if (res.symbol.length) {
      metadata[`${DIP721_V2}:symbol`] = { Text: res.symbol[0] };
    }
    if (res.logo.length) {
      metadata[`${DIP721_V2}:symbol`] = { Text: res.logo[0] };
    }
    metadata[`${DIP721_V2}:created_at`] = { Nat: res.created_at };
    metadata[`${DIP721_V2}:upgraded_at`] = { Nat: res.upgraded_at };
    res.custodians.forEach((custodian, index) => {
      metadata[`${DIP721_V2}:custodians:${index}`] = {
        Text: custodian.toText(),
      };
    });
    return metadata;
  }

  public async name?() {
    return (await this._actor.dip721_name())[0] ?? "Collection";
  }

  public async symbol?() {
    return (await this._actor.dip721_symbol())[0] ?? "NFT";
  }

  public async totalSupply?() {
    return this._actor.dip721_total_supply();
  }

  public async mintingAccount?() {
    const canisterId = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!canisterId) {
      throw Error("Agent with principal is required");
    }
    return canisterId.toText();
  }

  public async balanceOf?(account: string) {
    const res = await this._actor.dip721_balance_of(
      principalFromString(account)
    );
    return "Ok" in res ? res.Ok : BigInt(0);
  }

  public async ownerOf?(tokenId: bigint) {
    const res = await this._actor.dip721_owner_of(tokenId);
    return "Ok" in res ? res.Ok[0]?.toText() : undefined;
  }

  public async tokens?() {
    // Get all tokens based on total supply, this does include burned tokens
    const totalSupply = (await this.totalSupply?.()) ?? BigInt(0);
    return Array.from({ length: Number(totalSupply) }).map((_, index) =>
      BigInt(index)
    );
  }

  public async tokensOf?(account: string) {
    const res = await this._actor.dip721_owner_token_metadata(
      principalFromString(account)
    );
    return "Ok" in res
      ? res.Ok.map((tokenMetadata) => tokenMetadata.token_identifier)
      : [];
  }

  public async metadataOf?(tokenId: bigint) {
    const res = await this._actor.dip721_token_metadata(tokenId);
    if ("Ok" in res) {
      const metadata: { [key: string]: Value } = {
        [`${DIP721_V2}:token_identifier`]: { Nat: res.Ok.token_identifier },
        [`${DIP721_V2_MINT}:minted_by`]: { Text: res.Ok.minted_by.toText() },
        [`${DIP721_V2_MINT}:minted_at`]: { Nat: res.Ok.minted_at },
        [`${DIP721_V2_BURN}:is_burned`]: {
          Nat: BigInt(res.Ok.is_burned ? 1 : 0),
        },
      };
      if (res.Ok.owner.length) {
        metadata[`${DIP721_V2}:owner`] = {
          Text: res.Ok.owner[0].toText(),
        };
      }
      if (res.Ok.transferred_by.length) {
        metadata[`${DIP721_V2}:transferred_by`] = {
          Text: res.Ok.transferred_by[0].toText(),
        };
      }
      if (res.Ok.transferred_at.length) {
        metadata[`${DIP721_V2}:transferred_at`] = {
          Nat: res.Ok.transferred_at[0],
        };
      }
      if (res.Ok.burned_by.length) {
        metadata[`${DIP721_V2_BURN}:burned_by`] = {
          Text: res.Ok.burned_by[0].toText(),
        };
      }
      if (res.Ok.burned_at.length) {
        metadata[`${DIP721_V2_BURN}:burned_at`] = { Nat: res.Ok.burned_at[0] };
      }
      if (res.Ok.approved_by.length) {
        metadata[`${DIP721_V2_APPROVAL}:approved_by`] = {
          Text: res.Ok.approved_by[0].toText(),
        };
      }
      if (res.Ok.approved_at.length) {
        metadata[`${DIP721_V2_APPROVAL}:approved_at`] = {
          Nat: res.Ok.approved_at[0],
        };
      }
      if (res.Ok.operator.length) {
        metadata[`${DIP721_V2_APPROVAL}:operator`] = {
          Text: res.Ok.operator[0].toText(),
        };
      }
      return {
        ...metadata,
        ...Object.fromEntries(
          res.Ok.properties
            .map(([key, value]) =>
              flattenMetadataEntry([`${DIP721_V2}:properties:${key}`, value])
            )
            .flat()
        ),
      };
    }
  }

  public async transfer?(args: {
    to: string;
    tokenId: bigint;
  }): Promise<bigint> {
    const res = await this._actor.dip721_transfer(
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
    const res = await this._actor.dip721_approve(
      args.approved ? args.spender : canisterId,
      args.tokenId
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async setApprovalForAll?(args: {
    operator: Principal;
    approved: boolean;
  }) {
    const res = await this._actor.dip721_set_approval_for_all(
      args.operator,
      args.approved
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async isApprovedForAll?(operator: Principal, account: string) {
    const res = await this._actor.dip721_is_approved_for_all(
      operator,
      principalFromString(account)
    );
    return "Ok" in res && res.Ok;
  }

  public async transferFrom?(args: {
    from: string;
    to: string;
    tokenId: bigint;
  }): Promise<bigint> {
    const res = await this._actor.dip721_transfer_from(
      principalFromString(args.from),
      principalFromString(args.to),
      args.tokenId
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async getCustodians?() {
    return this._actor.dip721_custodians();
  }

  public async setCustodian?(args: {
    custodian: Principal;
    approved: boolean;
  }) {
    const custodians = await this.getCustodians!();
    if (args.approved) {
      custodians.push(args.custodian);
    } else {
      const index = custodians.findIndex(
        (custodian) => custodian.compareTo(args.custodian) === "eq"
      );
      if (index === -1) {
        return BigInt(0);
      }
      delete custodians[index];
    }
    await this._actor.dip721_set_custodians(custodians);
    return BigInt(0);
  }

  public async logo?() {
    return (await this._actor.dip721_logo())[0];
  }

  public async assetOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const key = `${DIP721_V2}:properties:location` as const;
    if (key in metadata && "Text" in metadata[key]) {
      return { location: metadata[key].Text };
    }
  }

  public async imageOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const key = `${DIP721_V2}:properties:thumbnail` as const;
    if (key in metadata && "Text" in metadata[key]) {
      return metadata[key].Text;
    }
  }
}
