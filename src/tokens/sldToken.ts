import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE, Value } from "./sld/sld.did";
import { idlFactory } from "./sld";
import {
  accountFromString,
  accountToString,
  numberToUint32,
  subaccountFromIndex,
} from "../utils";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import { Principal } from "@dfinity/principal";

export const SLD1 = "sld1"; // Base NFT standard
export const SLD2 = "sld2"; // Approval
export const SLD3 = "sld3"; // TODO: History
export const SLD4 = "sld4"; // Mint
export const SLD5 = "sld5"; // Burn
export const SLD6 = "sld6"; // Custodians
export const SLD7 = "sld7"; // Royalty fee
export const SLD8 = "sld8"; // Set royalty fee

export const tokenIdToSldTokenId = (canisterId: Principal, index: bigint) => {
  const array = new Uint8Array([
    ...canisterId.toUint8Array(),
    ...Array.from(numberToUint32(Number(index), false)),
    128,
  ]);
  return Principal.fromUint8Array(array).toText();
};

export class SldToken extends BaseToken implements Partial<Token> {
  public static readonly implementedStandards = [SLD1, SLD2, SLD4, SLD5];

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig) {
    super({ supportedStandards, ...actorConfig });
    this._actor = SldToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(SLD1)) {
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
      this.icon = undefined;
      this.logo = undefined;
      this.logoSquare = undefined;
      this.assetOf = undefined;
      this.thumbnailOf = undefined;
    }
    if (!supportedStandards.includes(SLD2)) {
      this.approve = undefined;
      this.setApproval = undefined;
      this.getApproved = undefined;
      this.transferFrom = undefined;
    }
    if (!supportedStandards.includes(SLD4)) {
      this.mint = undefined;
    }
    if (!supportedStandards.includes(SLD5)) {
      this.burn = undefined;
    }
    if (!supportedStandards.includes(SLD6)) {
      this.getCustodians = undefined;
      this.setCustodian = undefined;
    }
    if (!supportedStandards.includes(SLD7)) {
      this.royaltyFee = undefined;
    }
    if (!supportedStandards.includes(SLD8)) {
      this.setRoyaltyFee = undefined;
    }
  }

  public static create<T extends string>(config: TokenManagerConfig<T>) {
    return new SldToken(config) as unknown as BaseToken &
      (T extends typeof SLD1
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
            | "metadataOf"
            | "transfer"
            | "icon"
            | "logo"
            | "logoSquare"
            | "assetOf"
            | "thumbnailOf"
          >
        : {}) &
      (T extends typeof SLD2
        ? Pick<
            Token,
            "approve" | "setApproval" | "getApproved" | "transferFrom"
          >
        : {}) &
      (T extends typeof SLD4 ? Pick<Token, "mint"> : {}) &
      (T extends typeof SLD5 ? Pick<Token, "burn"> : {}) &
      (T extends typeof SLD6
        ? Pick<Token, "getCustodians" | "setCustodian">
        : {}) &
      (T extends typeof SLD7 ? Pick<Token, "royaltyFee"> : {}) &
      (T extends typeof SLD8 ? Pick<Token, "setRoyaltyFee"> : {});
  }

  public static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  public static async supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>> {
    try {
      return await Actor.createActor<_SERVICE>(
        idlFactory,
        config
      ).sld1_supported_standards();
    } catch (_) {
      return [];
    }
  }

  public async metadata?() {
    return Object.fromEntries(await this._actor.sld1_metadata());
  }

  public async name?() {
    return this._actor.sld1_name();
  }

  public async symbol?() {
    return this._actor.sld1_symbol();
  }

  public async totalSupply?() {
    return this._actor.sld1_total_supply();
  }

  public async mintingAccount?() {
    const res = await this._actor.sld1_minting_account();
    return accountToString({
      owner: res.owner,
      subaccount: res.subaccount[0],
    });
  }

  public async balanceOf?(account: string) {
    const { owner, subaccount } = accountFromString(account);
    return this._actor.sld1_balance_of({
      owner,
      subaccount: subaccount ? [subaccount] : [],
    });
  }

  public async ownerOf?(tokenId: bigint) {
    return (await this._actor.sld1_owner_of(tokenId)).map((account) =>
      accountToString({
        owner: account.owner,
        subaccount: account.subaccount[0],
      })
    )[0];
  }

  public async tokens?(page?: bigint) {
    return this._actor.sld1_tokens(page ?? BigInt(0));
  }

  public async tokensOf?(account: string, page?: bigint) {
    const { owner, subaccount } = accountFromString(account);
    return this._actor.sld1_tokens_of(
      { owner, subaccount: subaccount ? [subaccount] : [] },
      page ?? BigInt(0)
    );
  }

  public async metadataOf?(tokenId: bigint) {
    const res = await this._actor.sld1_metadata_of(tokenId);
    if (res.length) {
      return Object.fromEntries(res);
    }
  }

  public async transfer?(args: {
    to: string;
    tokenId: bigint;
    fromSubaccount?: Uint8Array | number[] | bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const { owner, subaccount } = accountFromString(args.to);
    const res = await this._actor.sld1_transfer({
      from_subaccount: args.fromSubaccount
        ? [
            (typeof args.fromSubaccount === "bigint"
              ? subaccountFromIndex(args.fromSubaccount)
              : args.fromSubaccount) as number[],
          ]
        : [],
      to: { owner, subaccount: subaccount ? [subaccount] : [] },
      token_id: args.tokenId,
      memo: args.memo ? [args.memo as number[]] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async approve?(args: {
    spender: Principal;
    tokenId: bigint;
    approved: boolean;
    fromSubaccount?: Uint8Array | number[] | bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const res = await this._actor.sld2_set_approval({
      from_subaccount: args.fromSubaccount
        ? [
            (typeof args.fromSubaccount === "bigint"
              ? subaccountFromIndex(args.fromSubaccount)
              : args.fromSubaccount) as number[],
          ]
        : [],
      spender: args.spender,
      token_id: args.tokenId,
      approved: args.approved,
      memo: args.memo ? [args.memo as number[]] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async setApproval?(args: {
    spender: Principal;
    tokenId: bigint;
    approved: boolean;
    fromSubaccount?: Uint8Array | number[] | bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint> {
    return this.approve!(args);
  }

  public async getApproved?(tokenId: bigint) {
    return this._actor.sld2_get_approved(tokenId);
  }

  public async transferFrom?(args: {
    from: string;
    to: string;
    tokenId: bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const from = accountFromString(args.from);
    const to = accountFromString(args.to);
    const res = await this._actor.sld2_transfer_from({
      from: {
        owner: from.owner,
        subaccount: from.subaccount ? [from.subaccount] : [],
      },
      to: { owner: to.owner, subaccount: to.subaccount ? [to.subaccount] : [] },
      token_id: args.tokenId,
      memo: args.memo ? [args.memo as number[]] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async mint?(args: {
    to: string;
    tokenId?: bigint;
    metadata?: { [key: string]: Value };
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }) {
    const to = accountFromString(args.to);
    const getAllTokens = async (page = BigInt(0)) => {
      const tokens = await this.tokens!(page);
      if (tokens.length === 0) {
        return [];
      }
      return [...tokens, ...(await getAllTokens(++page))];
    };
    const res = await this._actor.sld4_mint({
      to: { owner: to.owner, subaccount: to.subaccount ? [to.subaccount] : [] },
      token_id:
        args.tokenId ?? (await getAllTokens()).slice(-1)[0] ?? BigInt(0),
      metadata: Object.entries(args.metadata),
      memo: args.memo ? [args.memo as number[]] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async burn?(args: {
    tokenId: bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }) {
    const res = await this._actor.sld5_burn({
      token_id: args.tokenId,
      memo: args.memo ? [args.memo as number[]] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async getCustodians?() {
    return this._actor.sld6_get_custodians();
  }

  public async setCustodian?(args: {
    custodian: Principal;
    approved: boolean;
  }) {
    const res = await this._actor.sld6_set_custodian(args);
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async royaltyFee?(amount: bigint) {
    const res = await this._actor.sld7_royalty_fee(amount);
    return {
      account: accountToString({
        owner: res.account.owner,
        subaccount: res.account.subaccount[0],
      }),
      fee: res.fee,
    };
  }

  public async setRoyaltyFee?(args: { account: string; fee: number }) {
    const account = accountFromString(args.account);
    const res = await this._actor.sld8_set_royalty_fee({
      account: {
        owner: account.owner,
        subaccount: account.subaccount ? [account.subaccount] : [],
      },
      fee: args.fee,
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  public async icon?() {
    const metadata = await this.metadata!();
    if ("sld1:icon" in metadata && "Text" in metadata["sld1:icon"]) {
      return metadata["sld1:icon"].Text;
    }
  }

  public async logo?() {
    const metadata = await this.metadata!();
    if ("sld1:logo" in metadata && "Text" in metadata["sld1:logo"]) {
      return metadata["sld1:logo"].Text;
    }
  }

  public async logoSquare?() {
    const metadata = await this.metadata!();
    if (
      "sld1:logo_square" in metadata &&
      "Text" in metadata["sld1:logo_square"]
    ) {
      return metadata["sld1:logo_square"].Text;
    }
  }

  public async assetOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if ("sld1:asset" in metadata && "Text" in metadata["sld1:asset"]) {
      return metadata["sld1:asset"].Text;
    }
  }

  public async thumbnailOf?(tokenId: bigint) {
    const metadata = await this.metadataOf!(tokenId);
    if ("sld1:thumbnail" in metadata && "Text" in metadata["sld1:thumbnail"]) {
      return metadata["sld1:thumbnail"].Text;
    }
  }
}
