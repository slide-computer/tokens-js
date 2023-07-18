import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE, GenericValue } from "./dip721V2Beta/dip721V2Beta.did";
import { idlFactory } from "./dip721V2Beta";
import { principalFromString } from "../utils";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import { Principal } from "@dfinity/principal";
import { Value } from "./icrc1/icrc1.did";

export const DIP721_V2_BETA = "dip721_v2_beta";
export const DIP721_V2_BETA_MINT = "dip721_v2_beta_mint";
export const DIP721_V2_BETA_BURN = "dip721_v2_beta_burn";
export const DIP721_V2_BETA_APPROVAL = "dip721_v2_beta_approval";

export type DIP721_V2_BETA_TYPE =
  | typeof DIP721_V2_BETA
  | typeof DIP721_V2_BETA_MINT
  | typeof DIP721_V2_BETA_BURN
  | typeof DIP721_V2_BETA_APPROVAL;

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
    return [[key, { Nat: BigInt(value[intValueKey]) }]];
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
  throw Error("DIP721 V2 Beta metadata value could not be converted to value");
};
export type Dip721V2BetaMethods<T extends string | undefined = undefined> =
  (T extends typeof DIP721_V2_BETA
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
    (T extends typeof DIP721_V2_BETA_APPROVAL
      ? Pick<
          Token,
          "approve" | "setApprovalForAll" | "isApprovedForAll" | "transferFrom"
        >
      : {});

export class Dip721V2BetaToken extends BaseToken implements Partial<Token> {
  static implementedStandards = [
    DIP721_V2_BETA,
    DIP721_V2_BETA_MINT,
    DIP721_V2_BETA_BURN,
    DIP721_V2_BETA_APPROVAL,
  ] as const;
  static accountType = "principal" as const;

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig<string>) {
    super({ supportedStandards, ...actorConfig });
    this._actor = Dip721V2BetaToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(DIP721_V2_BETA)) {
      this.metadata = undefined;
      this.name = undefined;
      this.symbol = undefined;
      this.totalSupply = undefined;
      this.mintingAccount = undefined;
      this.balanceOf = undefined;
      this.ownerOf = undefined;
      this.tokens = undefined;
      this.tokensOf = undefined;
      this.metadataOf = undefined;
      this.transfer = undefined;
      this.getCustodians = undefined;
      this.setCustodian = undefined;
      this.logo = undefined;
    }
    if (!supportedStandards.includes(DIP721_V2_BETA_APPROVAL)) {
      this.approve = undefined;
      this.setApprovalForAll = undefined;
      this.isApprovedForAll = undefined;
      this.transferFrom = undefined;
    }
  }

  static create<T extends string>(config: TokenManagerConfig<T>) {
    return new Dip721V2BetaToken(config) as unknown as BaseToken &
      Dip721V2BetaMethods<T>;
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
      ).supportedInterfaces();
      return [
        DIP721_V2_BETA,
        ...res.map((supportedInterface) =>
          "Mint" in supportedInterface
            ? DIP721_V2_BETA_MINT
            : "Burn" in supportedInterface
            ? DIP721_V2_BETA_BURN
            : DIP721_V2_BETA_APPROVAL
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
    return "fungible" as const;
  }

  async metadata?() {
    const res = await this._actor.metadata();
    const metadata: Array<[string, Value]> = [
      [`${DIP721_V2_BETA}:created_at`, { Nat: res.created_at }],
      [`${DIP721_V2_BETA}:upgraded_at`, { Nat: res.upgraded_at }],
      ...res.custodians.map(
        (custodian) =>
          [`${DIP721_V2_BETA}:custodians`, { Text: custodian.toText() }] as [
            string,
            Value
          ]
      ),
    ];
    if (res.name.length) {
      metadata.push([`${DIP721_V2_BETA}:name`, { Text: res.name[0] }]);
    }
    if (res.symbol.length) {
      metadata.push([`${DIP721_V2_BETA}:symbol`, { Text: res.symbol[0] }]);
    }
    if (res.logo.length) {
      metadata.push([`${DIP721_V2_BETA}:logo`, { Text: res.logo[0] }]);
    }
    return metadata;
  }

  async name?() {
    return (await this._actor.name())[0] ?? "Collection";
  }

  async symbol?() {
    return (await this._actor.symbol())[0] ?? "NFT";
  }

  async totalSupply?() {
    return this._actor.totalSupply();
  }

  async mintingAccount?() {
    const canisterId = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!canisterId) {
      throw Error("Agent with principal is required");
    }
    return canisterId.toText();
  }

  async balanceOf?(account: string) {
    const res = await this._actor.balanceOf(principalFromString(account));
    return "Ok" in res ? res.Ok : BigInt(0);
  }

  async ownerOf?(tokenId: bigint) {
    const res = await this._actor.ownerOf(tokenId);
    return "Ok" in res ? res.Ok[0]?.toText() : undefined;
  }

  async tokens?() {
    // Get all tokens based on total supply, this does include burned tokens
    const totalSupply = (await this.totalSupply?.()) ?? BigInt(0);
    return Array.from({ length: Number(totalSupply) }).map((_, index) =>
      BigInt(index)
    );
  }

  async tokensOf?(account: string) {
    const res = await this._actor.ownerTokenMetadata(
      principalFromString(account)
    );
    return "Ok" in res
      ? res.Ok.map((tokenMetadata) => tokenMetadata.token_identifier)
      : [];
  }

  async metadataOf?(tokenId: bigint) {
    const res = await this._actor.tokenMetadata(tokenId);
    if ("Ok" in res) {
      const metadata: Array<[string, Value]> = [
        [
          `${DIP721_V2_BETA}:token_identifier`,
          { Nat: res.Ok.token_identifier },
        ],
        [`${DIP721_V2_BETA}:minted_by`, { Text: res.Ok.minted_by.toText() }],
        [`${DIP721_V2_BETA}:minted_at`, { Nat: res.Ok.minted_at }],
        [
          `${DIP721_V2_BETA}:is_burned`,
          { Nat: BigInt(res.Ok.is_burned ? 1 : 0) },
        ],
      ];
      if (res.Ok.owner.length) {
        metadata.push([
          `${DIP721_V2_BETA}:owner`,
          {
            Text: res.Ok.owner[0].toText(),
          },
        ]);
      }
      if (res.Ok.transferred_by.length) {
        metadata.push([
          `${DIP721_V2_BETA}:transferred_by`,
          {
            Text: res.Ok.transferred_by[0].toText(),
          },
        ]);
      }
      if (res.Ok.transferred_at.length) {
        metadata.push([
          `${DIP721_V2_BETA}:transferred_at`,
          {
            Nat: res.Ok.transferred_at[0],
          },
        ]);
      }
      if (res.Ok.burned_by.length) {
        metadata.push([
          `${DIP721_V2_BETA}:burned_by`,
          {
            Text: res.Ok.burned_by[0].toText(),
          },
        ]);
      }
      if (res.Ok.burned_at.length) {
        metadata.push([
          `${DIP721_V2_BETA}:burned_at`,
          {
            Nat: res.Ok.burned_at[0],
          },
        ]);
      }
      if (res.Ok.approved_by.length) {
        metadata.push([
          `${DIP721_V2_BETA}:approved_by`,
          {
            Text: res.Ok.approved_by[0].toText(),
          },
        ]);
      }
      if (res.Ok.approved_at.length) {
        metadata.push([
          `${DIP721_V2_BETA}:approved_at`,
          {
            Nat: res.Ok.approved_at[0],
          },
        ]);
      }
      if (res.Ok.operator.length) {
        metadata.push([
          `${DIP721_V2_BETA}:operator`,
          {
            Text: res.Ok.operator[0].toText(),
          },
        ]);
      }
      return [
        ...metadata,
        ...res.Ok.properties
          .map(([key, value]) =>
            flattenMetadataEntry([`${DIP721_V2_BETA}:properties:${key}`, value])
          )
          .flat(),
      ];
    }
  }

  async transfer?(args: { to: string; tokenId: bigint }): Promise<bigint> {
    const res = await this._actor.transfer(
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
    const res = await this._actor.approve(
      args.approved ? principalFromString(args.spender) : canisterId,
      args.tokenId
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async setApprovalForAll?(args: { operator: Principal; approved: boolean }) {
    const res = await this._actor.setApprovalForAll(
      args.operator,
      args.approved
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async isApprovedForAll?(operator: Principal, account: string) {
    const res = await this._actor.isApprovedForAll(
      operator,
      principalFromString(account)
    );
    return "Ok" in res && res.Ok;
  }

  async transferFrom?(args: {
    from: string;
    to: string;
    tokenId: bigint;
  }): Promise<bigint> {
    const res = await this._actor.transferFrom(
      principalFromString(args.from),
      principalFromString(args.to),
      args.tokenId
    );
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async getCustodians?() {
    return this._actor.custodians();
  }

  async setCustodian?(args: { custodian: Principal; approved: boolean }) {
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
    await this._actor.setCustodians(custodians);
    return BigInt(0);
  }

  async logo?() {
    return (await this._actor.logo())[0];
  }

  async assetOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const entry = metadata.find(
      ([key]) => key === `${DIP721_V2_BETA}:properties:location`
    );
    return entry && "Text" in entry[1]
      ? { location: entry[1].Text }
      : undefined;
  }

  public async imageOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const entry = metadata.find(
      ([key]) => key === `${DIP721_V2_BETA}:properties:thumbnail`
    );
    return entry && "Text" in entry[1] ? entry[1].Text : undefined;
  }

  public async attributesOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if (!metadata) {
      return;
    }
    const traitTypeRegExp = new RegExp(
      `^${DIP721_V2_BETA}:properties:(?!location$)(?!thumbnail$)([^:]+$)`
    );
    return metadata
      .filter(([key]) => traitTypeRegExp.test(key))
      .map(([key, value]) => {
        const traitType = traitTypeRegExp.exec(key)![1];
        return { value, traitType };
      });
  }
}
