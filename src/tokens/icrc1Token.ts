import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./icrc1/icrc1.did";
import { idlFactory } from "./icrc1";
import {
  accountFromString,
  accountToString,
  TokenManagerConfig,
} from "../index";
import { BaseToken, Token } from "./token";

export const ICRC1 = "ICRC-1";
export const ICRC2 = "ICRC-2";

export type ICRC1_TYPE = typeof ICRC1;

export type Icrc1Methods<T extends string | undefined = undefined> =
  (T extends typeof ICRC1
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
      >
    : {}) &
    (T extends typeof ICRC2
      ? Pick<Token, "approve" | "transferFrom" | "allowance">
      : {});

export class Icrc1Token extends BaseToken implements Partial<Token> {
  static implementedStandards = [ICRC1, ICRC2] as const;
  static accountType = "account" as const;

  private _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig<string>) {
    super({ supportedStandards, ...actorConfig });
    this._actor = Icrc1Token.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(ICRC1)) {
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
    }
    if (!supportedStandards.includes(ICRC2)) {
      this.approve = undefined;
      this.transferFrom = undefined;
      this.allowance = undefined;
    }
  }

  static create<T extends string>(config: TokenManagerConfig<T>) {
    return new Icrc1Token(config) as unknown as BaseToken & Icrc1Methods<T>;
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>> {
    return this.createActor(config)
      .icrc1_supported_standards()
      .catch(() => []);
  }

  static tokenType() {
    return "fungible" as const;
  }

  async metadata?() {
    return this._actor.icrc1_metadata();
  }

  async name?() {
    return this._actor.icrc1_name();
  }

  async symbol?() {
    return this._actor.icrc1_symbol();
  }

  async decimals?() {
    return this._actor.icrc1_decimals();
  }

  async fee?() {
    return this._actor.icrc1_fee();
  }

  async totalSupply?() {
    return this._actor.icrc1_total_supply();
  }

  async mintingAccount?() {
    return (await this._actor.icrc1_minting_account()).map(
      ({ owner, subaccount }) =>
        accountToString({ owner, subaccount: subaccount[0] })
    )[0];
  }

  async balanceOf?(account: string) {
    const { owner, subaccount } = accountFromString(account);
    return this._actor.icrc1_balance_of({
      owner,
      subaccount: subaccount ? [subaccount] : [],
    });
  }

  async transfer?(args: {
    fromSubaccount?: Uint8Array;
    to: string;
    amount: bigint;
    fee?: bigint;
    memo?: Uint8Array;
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const to = accountFromString(args.to);
    const res = await this._actor.icrc1_transfer({
      from_subaccount: args.fromSubaccount ? [args.fromSubaccount] : [],
      to: { owner: to.owner, subaccount: to.subaccount ? [to.subaccount] : [] },
      amount: args.amount,
      fee: args.fee ? [args.fee] : [],
      memo: args.memo ? [args.memo] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async logo?() {
    const logoMetadata = (await this._actor.icrc1_metadata()).find(
      ([key]) => key === "icrc1:logo"
    )?.[1];
    if (logoMetadata && "Text" in logoMetadata && logoMetadata.Text) {
      return logoMetadata.Text;
    }
    try {
      const asset = (
        await import(`../logos/${Actor.canisterIdOf(this._actor).toText()}.js`)
      ).default;
      return `data:image/svg+xml,${encodeURIComponent(
        asset.replace(/[\n\r]/g, "")
      ).replace(/%[\dA-F]{2}/g, (match: string) => {
        switch (match) {
          case "%20":
            return " ";
          case "%3D":
            return "=";
          case "%3A":
            return ":";
          case "%2F":
            return "/";
          default:
            return match.toLowerCase();
        }
      })}`;
    } catch (_) {
      // Asset could not be loaded or doesn't exist
    }
  }

  async approve?(args: {
    fromSubaccount?: Uint8Array;
    spender: string;
    amount: bigint;
    expectedAllowance?: bigint;
    expiresAt?: bigint;
    fee?: bigint;
    memo?: Uint8Array;
    createdAtTime?: bigint;
  }) {
    const spender = accountFromString(args.spender);
    const res = await this._actor.icrc2_approve({
      from_subaccount: args.fromSubaccount ? [args.fromSubaccount] : [],
      spender: {
        owner: spender.owner,
        subaccount: spender.subaccount ? [spender.subaccount] : [],
      },
      amount: args.amount,
      expected_allowance: args.expectedAllowance
        ? [args.expectedAllowance]
        : [],
      expires_at: args.expiresAt ? [args.expiresAt] : [],
      fee: args.fee ? [args.fee] : [],
      memo: args.memo ? [args.memo] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async transferFrom?(args: {
    spenderSubaccount?: Uint8Array;
    from: string;
    to: string;
    amount: bigint;
    fee?: bigint;
    memo?: Uint8Array;
    createdAtTime?: bigint;
  }) {
    const from = accountFromString(args.from);
    const to = accountFromString(args.to);
    const res = await this._actor.icrc2_transfer_from({
      spender_subaccount: args.spenderSubaccount
        ? [args.spenderSubaccount]
        : [],
      from: {
        owner: from.owner,
        subaccount: from.subaccount ? [from.subaccount] : [],
      },
      to: { owner: to.owner, subaccount: to.subaccount ? [to.subaccount] : [] },
      amount: args.amount,
      fee: args.fee ? [args.fee] : [],
      memo: args.memo ? [args.memo] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async allowance?(args: { account: string; spender: string }) {
    const account = accountFromString(args.account);
    const spender = accountFromString(args.spender);
    const res = await this._actor.icrc2_allowance({
      account: {
        owner: account.owner,
        subaccount: account.subaccount ? [account.subaccount] : [],
      },
      spender: {
        owner: spender.owner,
        subaccount: spender.subaccount ? [spender.subaccount] : [],
      },
    });
    return {
      allowance: res.allowance,
      expiresAt: res.expires_at[0],
    };
  }
}
