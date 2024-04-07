import {
  type CreateActor,
  createCandidDecoder,
  decodeAccount,
  type DecodeCall,
  encodeAccount,
  type FungibleTokenBatchMethods,
  type ImplementedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";

type Methods = Pick<FungibleTokenBatchMethods, "batchTransfer">;

export const Icrc4 = class implements Methods {
  static implementedStandards = ["ICRC-4"] as const;

  #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#actor = Icrc4.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "icrc4_transfer_batch": {
          const [batchTransferArgs] = decodeArgs("icrc4_transfer_batch", args);
          return {
            method: "batchTransfer",
            args: [
              batchTransferArgs.map((transferArgs) => ({
                amount: transferArgs.amount,
                fee: transferArgs.fee[0],
                fromSubaccount: transferArgs.from_subaccount[0]?.buffer,
                to: encodeAccount({
                  owner: transferArgs.to.owner,
                  subaccount: transferArgs.to.subaccount[0]?.buffer,
                }),
                memo: transferArgs.memo[0],
                createdAtTime: transferArgs.created_at_time[0],
              })),
            ],
          };
        }
      }
    } catch {}
  }

  batchTransfer(
    args: Array<{
      amount: bigint;
      fee?: bigint;
      fromSubaccount?: ArrayBuffer;
      to: string;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>> {
    const responsesPromise = this.#actor.icrc4_transfer_batch(
      args.map((transferArgs) => {
        const to = decodeAccount(transferArgs.to);
        return {
          amount: transferArgs.amount,
          fee: transferArgs.fee ? [transferArgs.fee] : [],
          from_subaccount: transferArgs.fromSubaccount
            ? [new Uint8Array(transferArgs.fromSubaccount)]
            : [],
          to: {
            owner: to.owner,
            subaccount: to.subaccount ? [new Uint8Array(to.subaccount)] : [],
          },
          memo: transferArgs.memo ? [new Uint8Array(transferArgs.memo)] : [],
          created_at_time: transferArgs.createdAtTime
            ? [transferArgs.createdAtTime]
            : [],
        };
      }),
    );
    return args.map(async (_, index) => {
      const responses = await responsesPromise;
      const response = responses[index][0];
      if (!response) {
        return;
      }
      if ("Err" in response) {
        throw response.Err;
      }
      return response.Ok;
    });
  }
} satisfies ImplementedStandards & CreateActor<_SERVICE> & DecodeCall<Methods>;
