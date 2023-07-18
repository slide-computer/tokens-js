import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./icp/icp.did";
import { idlFactory } from "./icp";
import { makeHttpAgentAnonymous, TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import {
  accountHashFromString,
  ICP_CANISTER_ID,
  numberFromUint32,
} from "../utils";
import { Value } from "./icrc1/icrc1.did";

export const ICP = "icp";

export type ICP_TYPE = typeof ICP;

export type IcpMethods<T extends string | undefined = undefined> =
  T extends typeof ICP
    ? Pick<
        Token,
        | "metadata"
        | "name"
        | "symbol"
        | "decimals"
        | "balanceOf"
        | "transfer"
        | "logo"
      >
    : {};

export class IcpToken extends BaseToken implements Partial<Token> {
  static canisterIds = [ICP_CANISTER_ID];
  static implementedStandards = [ICP] as const;
  static accountType = "hash" as const;

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig<string>) {
    super({ supportedStandards, ...actorConfig });
    this._actor = IcpToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(ICP)) {
      this.metadata = undefined;
      this.name = undefined;
      this.symbol = undefined;
      this.decimals = undefined;
      this.balanceOf = undefined;
      this.transfer = undefined;
      this.logo = undefined;
    }
  }

  static create<T extends string>(config: TokenManagerConfig<T>) {
    return new IcpToken(config) as unknown as BaseToken & IcpMethods<T>;
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>> {
    const canisterId =
      typeof config.canisterId === "string"
        ? config.canisterId
        : config.canisterId.toText();
    return IcpToken.canisterIds.includes(canisterId)
      ? [{ name: "ICP", url: "https://github.com/dfinity/ic" }]
      : [];
  }

  static tokenType() {
    return "nonFungible" as const;
  }

  async metadata?() {
    return [
      [`${ICP}:name`, { Text: await this.name!() }],
      [`${ICP}:symbol`, { Text: await this.symbol!() }],
      [`${ICP}:decimals`, { Nat: BigInt(await this.decimals!()) }],
      [`${ICP}:fee`, { Nat: BigInt(await this.fee!()) }],
    ] as Array<[string, Value]>;
  }

  async name?() {
    const { name } = await this._actor.name();
    return name;
  }

  async symbol?() {
    const { symbol } = await this._actor.symbol();
    return symbol;
  }

  async decimals?() {
    const { decimals } = await this._actor.decimals();
    return decimals;
  }

  async fee?() {
    const { transfer_fee } = await this._actor.transfer_fee({});
    return transfer_fee.e8s;
  }

  async balanceOf?(account: string) {
    const { e8s } = await this._actor.account_balance({
      account: Uint8Array.from(
        Buffer.from(accountHashFromString(account), "hex")
      ),
    });
    return e8s;
  }

  async transfer?(args: {
    to: string;
    amount: bigint;
    fee?: bigint;
    fromSubaccount?: Uint8Array;
    memo?: Uint8Array;
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const res = await this._actor.transfer({
      to: Uint8Array.from(Buffer.from(accountHashFromString(args.to), "hex")),
      fee: {
        e8s:
          args.fee ??
          // Make query calls within update calls anonymous so that agents from wallets don't have to ask for approval
          (
            await this._actor.transfer_fee.withOptions({
              agent: makeHttpAgentAnonymous(Actor.agentOf(this._actor)!),
            })({})
          ).transfer_fee.e8s,
      },
      memo: args.memo ? BigInt(numberFromUint32(args.memo, false)) : BigInt(0),
      from_subaccount: args.fromSubaccount ? [args.fromSubaccount] : [],
      created_at_time: args.createdAtTime
        ? [{ timestamp_nanos: args.createdAtTime }]
        : [],
      amount: { e8s: args.amount },
    });
    if ("Ok" in res) {
      return res.Ok;
    }
    throw Error(JSON.stringify(res.Err));
  }

  async logo?() {
    try {
      const asset = (await import(`../logos/${ICP_CANISTER_ID}.js`)).default;
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
      // Asset could not be loaded
    }
  }
}
