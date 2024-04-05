import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";

export interface Account {
  owner: Principal;
  subaccount: [] | [Subaccount];
}
export interface BurnArgs {
  token_id: TokenId;
  memo: [] | [Array<number>];
  created_at_time: [] | [bigint];
}
export type BurnError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { NotAllowed: null };
export interface MintArgs {
  to: Account;
  token_id: TokenId;
  metadata: Array<[string, Value]>;
  memo: [] | [Array<number>];
  created_at_time: [] | [bigint];
}
export type MintError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { NotAllowed: null };
export interface RoyaltyFee {
  fee: bigint;
  account: Account;
}
export interface SetApprovalArgs {
  token_id: TokenId;
  memo: [] | [Array<number>];
  from_subaccount: [] | [Subaccount];
  approved: boolean;
  created_at_time: [] | [bigint];
  spender: Principal;
}
export type SetApprovalError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { MaxApprovals: bigint }
  | { NotFound: null }
  | { NotOwner: null };
export interface SetApprovalForAllArgs {
  memo: [] | [Array<number>];
  from_subaccount: [] | [Subaccount];
  approved: boolean;
  created_at_time: [] | [bigint];
  spender: Principal;
}
export type SetApprovalForAllError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { MaxApprovals: bigint };
export interface SetCustodianArgs {
  approved: boolean;
  custodian: Principal;
}
export type SetCustodiansError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { NotAllowed: null }
  | { MaxCustodians: bigint };
export interface SetRoyaltyFeeArgs {
  fee: number;
  account: Account;
}
export type SetRoyaltyFeeError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { NotAllowed: null };
export type Subaccount = Array<number>;
export type TokenId = bigint;
export interface TransferArgs {
  to: Account;
  token_id: TokenId;
  memo: [] | [Array<number>];
  from_subaccount: [] | [Subaccount];
  created_at_time: [] | [bigint];
}
export type TransferError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { NotFound: null }
  | { NotOwner: null };
export interface TransferFromArgs {
  to: Account;
  token_id: TokenId;
  from: Account;
  memo: [] | [Array<number>];
  created_at_time: [] | [bigint];
}
export type TransferFromError =
  | {
      GenericError: { message: string; error_code: bigint };
    }
  | { TemporarilyUnavailable: null }
  | { NotFound: null }
  | { NotOwner: null }
  | { NotApproved: null };
export type Value =
  | { Int: bigint }
  | { Nat: bigint }
  | { Blob: Array<number> }
  | { Text: string };
export interface _SERVICE {
  sld1_balance_of: ActorMethod<[Account], bigint>;
  sld1_metadata: ActorMethod<[], Array<[string, Value]>>;
  sld1_metadata_of: ActorMethod<[TokenId], [] | [Array<[string, Value]>]>;
  sld1_minting_account: ActorMethod<[], Account>;
  sld1_name: ActorMethod<[], string>;
  sld1_owner_of: ActorMethod<[TokenId], [] | [Account]>;
  sld1_supported_standards: ActorMethod<
    [],
    Array<{ url: string; name: string }>
  >;
  sld1_symbol: ActorMethod<[], string>;
  sld1_tokens: ActorMethod<[bigint], Array<TokenId>>;
  sld1_tokens_of: ActorMethod<[Account, bigint], Array<TokenId>>;
  sld1_total_supply: ActorMethod<[], bigint>;
  sld1_transfer: ActorMethod<
    [TransferArgs],
    { Ok: bigint } | { Err: TransferError }
  >;
  sld2_get_approved: ActorMethod<[TokenId], Array<Principal>>;
  sld2_set_approval: ActorMethod<
    [SetApprovalArgs],
    { Ok: bigint } | { Err: SetApprovalError }
  >;
  sld2_set_approval_for_all: ActorMethod<
    [SetApprovalForAllArgs],
    { Ok: bigint } | { Err: SetApprovalForAllError }
  >;
  sld2_transfer_from: ActorMethod<
    [TransferFromArgs],
    { Ok: bigint } | { Err: TransferFromError }
  >;
  sld4_mint: ActorMethod<[MintArgs], { Ok: bigint } | { Err: MintError }>;
  sld5_burn: ActorMethod<[BurnArgs], { Ok: bigint } | { Err: BurnError }>;
  sld6_get_custodians: ActorMethod<[], Array<Principal>>;
  sld6_set_custodian: ActorMethod<
    [SetCustodianArgs],
    { Ok: bigint } | { Err: SetCustodiansError }
  >;
  sld7_royalty_fee: ActorMethod<[bigint], RoyaltyFee>;
  sld8_set_royalty_fee: ActorMethod<
    [SetRoyaltyFeeArgs],
    { Ok: bigint } | { Err: SetRoyaltyFeeError }
  >;
}
