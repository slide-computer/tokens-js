import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./icp/icp.did";
import { idlFactory } from "./icp";
import { TokenManagerConfig } from "../index";
import { BaseToken, Token } from "./token";
import {
  accountHashFromString,
  ICP_CANISTER_ID,
  numberFromUint32,
  subaccountFromIndex,
} from "../utils";

export const ICP = "ICP";

export class IcpToken extends BaseToken implements Partial<Token> {
  public static canisterIds = [ICP_CANISTER_ID];
  public static readonly implementedInterfaces = [ICP];

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedInterfaces = [],
    ...actorConfig
  }: TokenManagerConfig) {
    super({ supportedInterfaces, ...actorConfig });
    this._actor = IcpToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedInterfaces.includes(ICP)) {
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

  public static async supportedInterfaces(
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

  public async logo?() {
    return "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg width='180' height='180' viewBox='0 0 180 180' version='1.1' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m 120.122,63 c -6.507,0 -13.599,3.3341 -21.0961,9.9013 -3.5563,3.1119 -6.6278,6.446 -8.9314,9.1133 0,0 0,0 0.0203,0.0202 v -0.0202 c 0,0 3.6372,3.9605 7.6583,8.2039 2.1621,-2.5662 5.2739,-6.062 8.8509,-9.2143 6.668,-5.8397 11.012,-7.0723 13.498,-7.0723 9.356,0 16.953,7.4159 16.953,16.5291 0,9.0527 -7.618,16.469 -16.953,16.529 -0.425,0 -0.97,-0.06 -1.657,-0.202 2.728,1.172 5.658,2.021 8.446,2.021 17.136,0 20.49,-11.1746 20.712,-11.9828 0.505,-2.0409 0.768,-4.1828 0.768,-6.3854 C 148.391,75.3261 135.701,63 120.122,63 Z' fill='url(%23paint0_linear_2216_168)' id='path4' style='fill:url(%23paint0_linear_2216_168)'/%3E%3Cpath d='m 60.2693,117.963 c 6.5066,0 13.5991,-3.335 21.0959,-9.902 3.5563,-3.112 6.6278,-6.446 8.9313,-9.1131 0,0 0,0 -0.0202,-0.0202 v 0.0202 c 0,0 -3.6372,-3.9605 -7.6583,-8.2039 -2.1622,2.5663 -5.274,6.062 -8.8506,9.2143 -6.6682,5.8397 -11.0127,7.0727 -13.4981,7.0727 -9.3558,-0.021 -16.9535,-7.4364 -16.9535,-16.5497 0,-9.0526 7.6179,-16.4685 16.9535,-16.5291 0.4243,0 0.9699,0.0606 1.6569,0.202 -2.7279,-1.172 -5.6579,-2.0207 -8.4464,-2.0207 -17.1353,0 -20.4695,11.1744 -20.7119,11.9625 C 32.2627,86.1571 32,88.2788 32,90.4813 32,105.636 44.6899,117.963 60.2693,117.963 Z' fill='url(%23paint1_linear_2216_168)' id='path6' style='fill:url(%23paint1_linear_2216_168)'/%3E%3Cpath d='m 126.871,108.566 c -8.77,-0.222 -17.883,-7.133 -19.742,-8.8503 C 102.32,95.2702 91.2261,83.2472 90.3572,82.2975 82.2341,73.1842 71.2214,63 60.2693,63 h -0.0202 -0.0202 c -13.2961,0.0606 -24.4704,9.0728 -27.461,21.0959 0.2223,-0.7881 4.6071,-12.1847 20.6917,-11.7806 8.7698,0.2223 17.9234,7.2341 19.8027,8.9516 4.8092,4.4455 15.9027,16.4686 16.7716,17.4183 8.1231,9.0928 19.1361,19.2768 30.0881,19.2768 h 0.02 0.02 c 13.296,-0.06 24.491,-9.072 27.461,-21.0954 -0.242,0.788 -4.647,12.0834 -20.752,11.6994 z' fill='%2329abe2' id='path8'/%3E%3Cdefs id='defs25'%3E%3ClinearGradient id='paint0_linear_2216_168' x1='105.406' y1='66.624' x2='143.842' y2='106.425' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0.21' stop-color='%23F15A24' id='stop12'/%3E%3Cstop offset='0.6841' stop-color='%23FBB03B' id='stop14'/%3E%3C/linearGradient%3E%3ClinearGradient id='paint1_linear_2216_168' x1='74.985' y1='114.339' x2='36.5495' y2='74.5375' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0.21' stop-color='%23ED1E79' id='stop17'/%3E%3Cstop offset='0.8929' stop-color='%23522785' id='stop19'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E%0A";
  }
}
