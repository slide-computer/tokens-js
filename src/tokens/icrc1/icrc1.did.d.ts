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

export type Value =
  | { Int: bigint }
  | { Nat: bigint }
  | { Blob: Uint8Array }
  | { Text: string };

export interface AllowanceArgs {
  account: Account;
  spender: Account;
}

export interface ApproveArgs {
  fee: [] | [bigint];
  memo: [] | [Uint8Array];
  from_subaccount: [] | [Uint8Array];
  created_at_time: [] | [bigint];
  amount: bigint;
  expected_allowance: [] | [bigint];
  expires_at: [] | [bigint];
  spender: Account;
}

export type ApproveError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { Duplicate: { duplicate_of: bigint } }
  | { BadFee: { expected_fee: bigint } }
  | { AllowanceChanged: { current_allowance: bigint } }
  | { CreatedInFuture: { ledger_time: bigint } }
  | { TooOld: null }
  | { Expired: { ledger_time: bigint } }
  | { InsufficientFunds: { balance: bigint } };

export interface TransferFromArgs {
  spender_subaccount: [Uint8Array] | [];
  to: Account;
  fee: [] | [bigint];
  from: Account;
  memo: [] | [Uint8Array];
  created_at_time: [] | [bigint];
  amount: bigint;
}

export type TransferFromError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { InsufficientAllowance: { allowance: bigint } }
  | { BadBurn: { min_burn_amount: bigint } }
  | { Duplicate: { duplicate_of: bigint } }
  | { BadFee: { expected_fee: bigint } }
  | { CreatedInFuture: { ledger_time: bigint } }
  | { TooOld: null }
  | { InsufficientFunds: { balance: bigint } };

export interface _SERVICE {
  icrc1_balance_of: ActorMethod<[Account], bigint>;
  icrc1_decimals: ActorMethod<[], number>;
  icrc1_fee: ActorMethod<[], bigint>;
  icrc1_metadata: ActorMethod<[], Array<[string, Value]>>;
  icrc1_minting_account: ActorMethod<[], [] | [Account]>;
  icrc1_name: ActorMethod<[], string>;
  icrc1_supported_standards: ActorMethod<
    [],
    Array<{ url: string; name: string }>
  >;
  icrc1_symbol: ActorMethod<[], string>;
  icrc1_total_supply: ActorMethod<[], bigint>;
  icrc1_transfer: ActorMethod<
    [TransferArgs],
    { Ok: bigint } | { Err: TransferError }
  >;
  icrc2_allowance: ActorMethod<
    [AllowanceArgs],
    { allowance: bigint; expires_at: [] | [bigint] }
  >;
  icrc2_approve: ActorMethod<
    [ApproveArgs],
    { Ok: bigint } | { Err: ApproveError }
  >;
  icrc2_transfer_from: ActorMethod<
    [TransferFromArgs],
    { Ok: bigint } | { Err: TransferFromError }
  >;
}
