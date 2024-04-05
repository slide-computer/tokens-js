import {
  type CreateActor,
  decodeAccount,
  type DecodeCall,
  decodeCbor,
  encodeAccount,
  type FungibleTokenMethods,
  type ImplementedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";

type Methods = Pick<
  FungibleTokenMethods,
  "transferFrom" | "approve" | "allowance"
>;

export const Icrc2 = class implements Methods {
  static implementedStandards = ["ICRC-1"] as const;

  #config: TokenConfig;
  #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Icrc2.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    switch (method) {
      case "icrc2_transfer_from": {
        const [transferFromArgs] =
          decodeCbor<Parameters<_SERVICE["icrc2_transfer_from"]>>(args);
        return {
          method: "transferFrom",
          args: [
            {
              amount: transferFromArgs.amount,
              fee: transferFromArgs.fee[0],
              from: encodeAccount({
                owner: Principal.from(transferFromArgs.from.owner),
                subaccount: transferFromArgs.from.subaccount[0]?.buffer,
              }),
              to: encodeAccount({
                owner: Principal.from(transferFromArgs.to.owner),
                subaccount: transferFromArgs.to.subaccount[0]?.buffer,
              }),
              memo: transferFromArgs.memo[0],
              createdAtTime: transferFromArgs.created_at_time[0],
            },
          ],
        };
      }
      case "icrc2_approve": {
        const [approveArgs] =
          decodeCbor<Parameters<_SERVICE["icrc2_approve"]>>(args);
        return {
          method: "approve",
          args: [
            {
              amount: approveArgs.amount,
              fromSubaccount: approveArgs.from_subaccount[0]?.buffer,
              spender: encodeAccount({
                owner: Principal.from(approveArgs.spender.owner),
                subaccount: approveArgs.spender.subaccount[0]?.buffer,
              }),
              fee: approveArgs.fee[0],
              expiresAt: approveArgs.expires_at[0],
              memo: approveArgs.memo[0],
              createdAtTime: approveArgs.created_at_time[0],
              expectedAllowance: approveArgs.expected_allowance[0],
            },
          ],
        };
      }
      case "icrc2_allowance": {
        const [allowanceArgs] =
          decodeCbor<Parameters<_SERVICE["icrc2_allowance"]>>(args);
        return {
          method: "allowance",
          args: [
            {
              account: encodeAccount({
                owner: Principal.from(allowanceArgs.account.owner),
                subaccount: allowanceArgs.account.subaccount[0]?.buffer,
              }),
              spender: encodeAccount({
                owner: Principal.from(allowanceArgs.spender.owner),
                subaccount: allowanceArgs.spender.subaccount[0]?.buffer,
              }),
            },
          ],
        };
      }
    }
  }

  async transferFrom(args: {
    amount: bigint;
    fee?: bigint;
    spenderSubaccount?: ArrayBuffer;
    from: string;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const from = decodeAccount(args.from);
    const to = decodeAccount(args.to);
    const response = await this.#actor.icrc2_transfer_from({
      amount: args.amount,
      fee: args.fee ? [args.fee] : [],
      spender_subaccount: args.spenderSubaccount
        ? [new Uint8Array(args.spenderSubaccount)]
        : [],
      from: {
        owner: from.owner,
        subaccount: from.subaccount ? [new Uint8Array(from.subaccount)] : [],
      },
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

  async approve(args: {
    amount: bigint;
    fromSubaccount?: ArrayBuffer;
    spender: string;
    fee?: bigint;
    expiresAt?: bigint;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
    expectedAllowance?: bigint;
  }): Promise<bigint> {
    const spender = decodeAccount(args.spender);
    const response = await this.#actor.icrc2_approve({
      amount: args.amount,
      fee: args.fee ? [args.fee] : [],
      from_subaccount: args.fromSubaccount
        ? [new Uint8Array(args.fromSubaccount)]
        : [],
      spender: {
        owner: spender.owner,
        subaccount: spender.subaccount
          ? [new Uint8Array(spender.subaccount)]
          : [],
      },
      expires_at: args.expiresAt ? [args.expiresAt] : [],
      memo: args.memo ? [new Uint8Array(args.memo)] : [],
      created_at_time: args.createdAtTime ? [args.createdAtTime] : [],
      expected_allowance: args.expectedAllowance
        ? [args.expectedAllowance]
        : [],
    });
    if ("Err" in response) {
      throw response.Err;
    }
    return response.Ok;
  }

  async allowance(args: {
    account: string;
    spender: string;
  }): Promise<{ allowance: bigint; expiresAt?: bigint }> {
    const account = decodeAccount(args.account);
    const spender = decodeAccount(args.spender);
    return this.#actor.icrc2_allowance.withOptions({
      agent: this.#config.queryAgent,
    })({
      account: {
        owner: account.owner,
        subaccount: account.subaccount
          ? [new Uint8Array(account.subaccount)]
          : [],
      },
      spender: {
        owner: spender.owner,
        subaccount: spender.subaccount
          ? [new Uint8Array(spender.subaccount)]
          : [],
      },
    });
  }
} satisfies ImplementedStandards & CreateActor<_SERVICE> & DecodeCall<Methods>;
