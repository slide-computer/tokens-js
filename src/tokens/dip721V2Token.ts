import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE, GenericValue } from "./dip721V2/dip721V2.did";
import { idlFactory } from "./dip721V2";
import { principalFromString } from "../utils";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token, Value } from "./token";
import { Principal } from "@dfinity/principal";

export const DIP721_V2 = "dip721_v2";
export const DIP721_V2_MINT = "dip721_v2_mint";
export const DIP721_V2_BURN = "dip721_v2_burn";
export const DIP721_V2_APPROVAL = "dip721_v2_approval";

const flattenMetadataEntry = ([key, value]: [string, GenericValue]): Array<{
  key: string;
  value: Value;
}> => {
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
    return [{ key, value: { Nat: BigInt(value[natValueKey]) } }];
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
    return [{ key, value: { Nat: BigInt(value[intValueKey]) } }];
  }
  if ("FloatContent" in value) {
    return [{ key, value: { Text: value.FloatContent.toString() } }];
  }
  if ("BoolContent" in value) {
    return [{ key, value: { Nat: BigInt(value.BoolContent ? 1 : 0) } }];
  }
  if ("BlobContent" in value) {
    return [{ key, value: { Blob: value.BlobContent } }];
  }
  if ("Principal" in value) {
    return [{ key, value: { Text: value.Principal.toText() } }];
  }
  if ("TextContent" in value) {
    return [{ key, value: { Text: value.TextContent } }];
  }
  if ("NestedContent" in value) {
    return value.NestedContent.map(([nestedKey, nestedValue]) =>
      flattenMetadataEntry([key + ":" + nestedKey, nestedValue])
    ).flat();
  }
  throw Error("DIP721 V2 metadata value could not be converted to value");
};

export type Dip721V2Methods<T extends string | undefined = undefined> =
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
          "approve" | "setApprovalForAll" | "isApprovedForAll" | "transferFrom"
        >
      : {});

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
  }: TokenManagerConfig<string>) {
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
      Dip721V2Methods<T>;
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
    const metadata: Array<{ key: string; value: Value }> = [
      { key: `${DIP721_V2}:created_at`, value: { Nat: res.created_at } },
      { key: `${DIP721_V2}:upgraded_at`, value: { Nat: res.upgraded_at } },
      ...res.custodians.map((custodian) => ({
        key: `${DIP721_V2}:custodians`,
        value: { Text: custodian.toText() },
      })),
    ];
    if (res.name.length) {
      metadata.push({ key: `${DIP721_V2}:name`, value: { Text: res.name[0] } });
    }
    if (res.symbol.length) {
      metadata.push({
        key: `${DIP721_V2}:symbol`,
        value: { Text: res.symbol[0] },
      });
    }
    if (res.logo.length) {
      metadata.push({ key: `${DIP721_V2}:logo`, value: { Text: res.logo[0] } });
    }
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
      const metadata: Array<{ key: string; value: Value }> = [
        {
          key: `${DIP721_V2}:token_identifier`,
          value: { Nat: res.Ok.token_identifier },
        },
        {
          key: `${DIP721_V2}:minted_by`,
          value: { Text: res.Ok.minted_by.toText() },
        },
        { key: `${DIP721_V2}:minted_at`, value: { Nat: res.Ok.minted_at } },
        {
          key: `${DIP721_V2}:is_burned`,
          value: { Nat: BigInt(res.Ok.is_burned ? 1 : 0) },
        },
      ];
      if (res.Ok.owner.length) {
        metadata.push({
          key: `${DIP721_V2}:owner`,
          value: {
            Text: res.Ok.owner[0].toText(),
          },
        });
      }
      if (res.Ok.transferred_by.length) {
        metadata.push({
          key: `${DIP721_V2}:transferred_by`,
          value: {
            Text: res.Ok.transferred_by[0].toText(),
          },
        });
      }
      if (res.Ok.transferred_at.length) {
        metadata.push({
          key: `${DIP721_V2}:transferred_at`,
          value: {
            Nat: res.Ok.transferred_at[0],
          },
        });
      }
      if (res.Ok.burned_by.length) {
        metadata.push({
          key: `${DIP721_V2}:burned_by`,
          value: {
            Text: res.Ok.burned_by[0].toText(),
          },
        });
      }
      if (res.Ok.burned_at.length) {
        metadata.push({
          key: `${DIP721_V2}:burned_at`,
          value: {
            Nat: res.Ok.burned_at[0],
          },
        });
      }
      if (res.Ok.approved_by.length) {
        metadata.push({
          key: `${DIP721_V2}:approved_by`,
          value: {
            Text: res.Ok.approved_by[0].toText(),
          },
        });
      }
      if (res.Ok.approved_at.length) {
        metadata.push({
          key: `${DIP721_V2}:approved_at`,
          value: {
            Nat: res.Ok.approved_at[0],
          },
        });
      }
      if (res.Ok.operator.length) {
        metadata.push({
          key: `${DIP721_V2}:operator`,
          value: {
            Text: res.Ok.operator[0].toText(),
          },
        });
      }
      return [
        ...metadata,
        ...res.Ok.properties
          .map(([key, value]) =>
            flattenMetadataEntry([`${DIP721_V2}:properties:${key}`, value])
          )
          .flat(),
      ];
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
    const entry = metadata.find(
      ({ key }) => key === `${DIP721_V2}:properties:location`
    );
    return entry && "Text" in entry.value
      ? { location: entry.value.Text }
      : undefined;
  }

  public async imageOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const entry = metadata.find(
      ({ key }) => key === `${DIP721_V2}:properties:thumbnail`
    );
    return entry && "Text" in entry.value ? entry.value.Text : undefined;
  }

  public async attributesOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const traitTypeRegExp = new RegExp(
      `^${DIP721_V2}:properties:(?!location$)(?!thumbnail$)([^:]+$)`
    );
    return metadata
      .filter(({ key }) => traitTypeRegExp.test(key))
      .map(({ key, value }) => {
        const traitType = traitTypeRegExp.exec(key)![1];
        return { value, traitType };
      });
  }
}
