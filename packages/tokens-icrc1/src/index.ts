import {
  type CommonTokenMethods,
  type CreateActor,
  createCandidDecoder,
  decodeAccount,
  type DecodeCall,
  encodeAccount,
  type FungibleTokenMethods,
  type ImplementedStandards,
  type MetadataValue,
  type SupportedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";

type Methods = Pick<
  CommonTokenMethods,
  | "metadata"
  | "name"
  | "symbol"
  | "logo"
  | "totalSupply"
  | "maxMemoSize"
  | "balanceOf"
> &
  Pick<
    FungibleTokenMethods,
    "decimals" | "fee" | "mintingAccount" | "transfer"
  >;

export const Icrc1 = class implements Methods {
  static implementedStandards = ["ICRC-1"] as const;

  readonly #config: TokenConfig;
  readonly #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Icrc1.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
    config: ActorConfig,
  ): Promise<Array<{ name: string; url: string }>> {
    return this.createActor(config)
      .icrc1_supported_standards()
      .catch(() => []);
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "icrc1_metadata":
          return { method: "metadata", args: [] };
        case "icrc1_name":
          return { method: "name", args: [] };
        case "icrc1_symbol":
          return { method: "symbol", args: [] };
        case "icrc1_total_supply":
          return { method: "totalSupply", args: [] };
        case "icrc1_balance_of":
          const [account] = decodeArgs("icrc1_balance_of", args);
          return {
            method: "balanceOf",
            args: [
              encodeAccount({
                owner: account.owner,
                subaccount: account.subaccount[0]?.buffer,
              }),
            ],
          };
        case "icrc1_decimals":
          return { method: "decimals", args: [] };
        case "icrc1_fee":
          return { method: "fee", args: [] };
        case "icrc1_minting_account":
          return { method: "mintingAccount", args: [] };
        case "icrc1_transfer": {
          const [transferArgs] = decodeArgs("icrc1_transfer", args);
          return {
            method: "transfer",
            args: [
              {
                amount: transferArgs.amount,
                fee: transferArgs.fee[0],
                fromSubaccount: transferArgs.from_subaccount[0]?.buffer,
                to: encodeAccount({
                  owner: transferArgs.to.owner,
                  subaccount: transferArgs.to.subaccount[0]?.buffer,
                }),
                memo: transferArgs.memo[0],
                createdAtTime: transferArgs.created_at_time[0],
              },
            ],
          };
        }
      }
    } catch {}
  }

  async metadata(): Promise<[string, MetadataValue][]> {
    return this.#actor.icrc1_metadata.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async name(): Promise<string> {
    return this.#actor.icrc1_name.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async symbol(): Promise<string> {
    return this.#actor.icrc1_symbol.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async logo(): Promise<string | undefined> {
    const metadata = await this.metadata();
    const logo = metadata.find(([key, value]) => key === "icrc1:logo");
    if (logo && "Text" in logo[1]) {
      return logo[1].Text;
    }
  }

  async totalSupply(): Promise<bigint> {
    return this.#actor.icrc1_total_supply.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async maxMemoSize(): Promise<number> {
    const metadata = await this.metadata();
    const maxMemoSize = metadata.find(
      ([key, value]) => key === "icrc1:max_memo_size",
    );
    if (!maxMemoSize || !("Nat" in maxMemoSize[1])) {
      // Minimum value defined ICRC-1 standard
      return 32;
    }
    return Number(maxMemoSize[1].Nat);
  }

  async balanceOf(account: string): Promise<bigint> {
    const of = decodeAccount(account);
    return this.#actor.icrc1_balance_of.withOptions({
      agent: this.#config.queryAgent,
    })({
      owner: of.owner,
      subaccount: of.subaccount ? [new Uint8Array(of.subaccount)] : [],
    });
  }

  async decimals(): Promise<number> {
    return this.#actor.icrc1_decimals.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async fee(): Promise<bigint> {
    return this.#actor.icrc1_fee.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async mintingAccount(): Promise<string | undefined> {
    const account = await this.#actor.icrc1_minting_account.withOptions({
      agent: this.#config.queryAgent,
    })();
    if (account[0]) {
      return encodeAccount({
        owner: account[0].owner,
        subaccount: account[0].subaccount[0]?.buffer,
      });
    }
  }

  async transfer(args: {
    amount: bigint;
    fee?: bigint;
    fromSubaccount?: ArrayBuffer;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const to = decodeAccount(args.to);
    const response = await this.#actor.icrc1_transfer({
      amount: args.amount,
      fee: args.fee ? [args.fee] : [],
      from_subaccount: args.fromSubaccount
        ? [new Uint8Array(args.fromSubaccount)]
        : [],
      to: {
        owner: to.owner,
        subaccount: to.subaccount ? [new Uint8Array(to.subaccount)] : [],
      },
      memo: args.memo ? [new Uint8Array(args.memo)] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
    });
    if ("Err" in response) {
      throw response.Err;
    }
    return response.Ok;
  }
} satisfies SupportedStandards &
  ImplementedStandards &
  CreateActor<_SERVICE> &
  DecodeCall<Methods>;
