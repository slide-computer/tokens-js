import type { Principal } from "@dfinity/principal";
import { ActorMethod } from "@dfinity/agent";

export interface Account {
  owner: Principal;
  subaccount: [] | [Subaccount];
}

export type Duration = bigint;
export type Subaccount = Uint8Array;
export type Timestamp = bigint;

export interface TransferArgs {
  to: Account;
  fee: [] | [bigint];
  memo: [] | [Uint8Array];
  from_subaccount: [] | [Subaccount];
  created_at_time: [] | [Timestamp];
  amount: bigint;
}

export type TransferError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { BadBurn: { min_burn_amount: bigint } }
  | { Duplicate: { duplicate_of: bigint } }
  | { BadFee: { expected_fee: bigint } }
  | { CreatedInFuture: { ledger_time: Timestamp } }
  | { TooOld: null }
  | { InsufficientFunds: { balance: bigint } };

export interface _SERVICE {
  icrc4_transfer_batch: ActorMethod<
    [TransferArgs[]],
    Array<[] | [{ Ok: bigint } | { Err: TransferError }]>
  >;
}
