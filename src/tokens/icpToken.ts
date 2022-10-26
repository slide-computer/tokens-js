import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./icp/icp.did";
import { idlFactory } from "./icp";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import {
  ICP_CANISTER_ID,
  accountHashFromString,
  numberFromUint32,
  subaccountFromIndex,
} from "../utils";

export const ICP = "ICP";

export class IcpToken extends BaseToken implements Partial<Token> {
  public static canisterIds = [ICP_CANISTER_ID];
  public static readonly implementedStandards = [ICP];

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig) {
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
    }
  }

  public static create<T extends string>(config: TokenManagerConfig<T>) {
    return new IcpToken(config) as unknown as BaseToken &
      (T extends typeof ICP
        ? Pick<
            Token,
            | "metadata"
            | "name"
            | "symbol"
            | "decimals"
            | "balanceOf"
            | "transfer"
          >
        : {});
  }

  public static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  public static async supportedStandards(
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

  public async metadata?() {
    return {
      [`${ICP}:name`]: { Text: await this.name!() },
      [`${ICP}:symbol`]: { Text: await this.symbol!() },
      [`${ICP}:decimals`]: { Nat: BigInt(await this.decimals!()) },
      [`${ICP}:fee`]: { Nat: BigInt(await this.fee!()) },
    };
  }

  public async name?() {
    const { name } = await this._actor.name();
    return name;
  }

  public async symbol?() {
    const { symbol } = await this._actor.symbol();
    return symbol;
  }

  public async decimals?() {
    const { decimals } = await this._actor.decimals();
    return decimals;
  }

  public async fee?() {
    const { transfer_fee } = await this._actor.transfer_fee({});
    return transfer_fee.e8s;
  }

  public async balanceOf?(account: string) {
    const { e8s } = await this._actor.account_balance({
      account: Buffer.from(
        accountHashFromString(account),
        "hex"
      ) as unknown as number[],
    });
    return e8s;
  }

  public async transfer?(args: {
    to: string;
    amount: bigint;
    fee?: bigint;
    fromSubaccount?: Uint8Array | number[] | bigint;
    memo?: Uint8Array | number[];
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const res = await this._actor.transfer({
      to: Buffer.from(
        accountHashFromString(args.to),
        "hex"
      ) as unknown as number[],
      fee: { e8s: args.fee ?? (await this.fee!()) },
      memo: args.memo
        ? BigInt(
            numberFromUint32(
              Array.isArray(args.memo) ? Uint8Array.from(args.memo) : args.memo,
              false
            )
          )
        : BigInt(0),
      from_subaccount: args.fromSubaccount
        ? [
            (typeof args.fromSubaccount === "bigint"
              ? subaccountFromIndex(args.fromSubaccount)
              : args.fromSubaccount) as number[],
          ]
        : [],
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
}
