import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";

export type AccountIdentifier = string;
export type AccountIdentifierReturn =
  | { Ok: AccountIdentifier }
  | { Err: CommonError };
export type ApiError =
  | { ZeroAddress: null }
  | { InvalidTokenId: null }
  | { Unauthorized: null }
  | { Other: null };
export type ApproveResult = { Ok: User } | { Err: ApiError };
export type Balance = bigint;
export type BalanceReturn = { Ok: Balance } | { Err: CommonError };
export type CommonError = { InvalidToken: TokenIdentifier } | { Other: string };
export type Date = bigint;

export interface ExtendedMetadataResult {
  token_id: bigint;
  metadata_desc: MetadataDesc;
}

export type InterfaceId =
  | { Burn: null }
  | { Mint: null }
  | { Approval: null }
  | { TransactionHistory: null }
  | { TransferNotification: null };

export interface LogoResult {
  data: string;
  logo_type: string;
}

export type Memo = Uint8Array;
export type Metadata =
  | {
      fungible: {
        decimals: number;
        metadata: [] | [MetadataContainer];
        name: string;
        symbol: string;
      };
    }
  | { nonfungible: [] | [MetadataContainer] };
export type MetadataContainer =
  | { blob: Uint8Array }
  | { data: Array<MetadataValue> }
  | { json: string };
export type MetadataDesc = Array<MetadataPart>;

export interface MetadataKeyVal {
  key: string;
  val: MetadataVal;
}

export interface MetadataPart {
  data: Uint8Array;
  key_val_data: Array<MetadataKeyVal>;
  purpose: MetadataPurpose;
}

export type MetadataPurpose = { Preview: null } | { Rendered: null };
export type MetadataResult = { Ok: MetadataDesc } | { Err: ApiError };
export type MetadataReturn = { Ok: Metadata } | { Err: CommonError };
export type MetadataVal =
  | { Nat64Content: bigint }
  | { Nat32Content: number }
  | { Nat8Content: number }
  | { NatContent: bigint }
  | { Nat16Content: number }
  | { BlobContent: Uint8Array }
  | { TextContent: string };
export type MetadataValue = [string, Value];
export type MintReceipt = { Ok: MintReceiptPart } | { Err: ApiError };

export interface MintReceiptPart {
  id: bigint;
  token_id: bigint;
}

export interface MintRequest {
  to: User;
  metadata: [] | [MetadataContainer];
}

export type OwnerResult = { Ok: Principal } | { Err: ApiError };
export type SubAccount = Uint8Array;
export type TokenIdentifier = string;
export type TokenIndex = number;

export interface TokenMetadata {
  principal: Principal;
  metadata: Metadata;
  account_identifier: AccountIdentifier;
  token_identifier: TokenIdentifier;
}

export interface Transaction {
  date: Date;
  request: TransferRequest;
  txid: TransactionId;
}

export type TransactionId = bigint;

export interface TransactionRequest {
  token: TokenIdentifier;
  query: TransactionRequestFilter;
}

export type TransactionRequestFilter =
  | { date: [Date, Date] }
  | { page: [bigint, bigint] }
  | { txid: TransactionId }
  | { user: User };

export interface TransactionResult {
  fee: bigint;
  transaction_type: TransactionType;
}

export type TransactionType =
  | {
      Approve: { to: Principal; token_id: bigint; from: Principal };
    }
  | { Burn: { token_id: bigint } }
  | { Mint: { to: Principal; token_id: bigint } }
  | { SetApprovalForAll: { to: Principal; from: Principal } }
  | {
      Transfer: { to: Principal; token_id: bigint; from: Principal };
    }
  | {
      TransferFrom: {
        to: Principal;
        token_id: bigint;
        from: Principal;
      };
    };

export interface TransferRequest {
  to: User;
  token: TokenIdentifier;
  notify: boolean;
  from: User;
  memo: Memo;
  subaccount: [] | [SubAccount];
  amount: Balance;
}

export type TransferResponse =
  | { Ok: Balance }
  | {
      Err:
        | { CannotNotify: AccountIdentifier }
        | { InsufficientBalance: null }
        | { InvalidToken: TokenIdentifier }
        | { Rejected: null }
        | { Unauthorized: AccountIdentifier }
        | { Other: string };
    };
export type TrasactionsResult =
  | { Ok: Array<Transaction> }
  | { Err: CommonError };
export type TxReceipt = { Ok: bigint } | { Err: ApiError };
export type User = { principal: Principal } | { address: AccountIdentifier };
export type Value =
  | { nat: bigint }
  | { blob: Uint8Array }
  | { nat8: number }
  | { text: string };

export interface erc721_token {
  add: ActorMethod<[TransferRequest], TransactionId>;
  approveDip721: ActorMethod<[Principal, bigint], ApproveResult>;
  balanceOfDip721: ActorMethod<[Principal], bigint>;
  bearer: ActorMethod<[TokenIdentifier], AccountIdentifierReturn>;
  getAllMetadataForUser: ActorMethod<[User], Array<TokenMetadata>>;
  getMaxLimitDip721: ActorMethod<[], number>;
  getMetadataDip721: ActorMethod<[bigint], MetadataResult>;
  getMetadataForUserDip721: ActorMethod<
    [Principal],
    Array<ExtendedMetadataResult>
  >;
  getTokenIdsForUserDip721: ActorMethod<[Principal], Array<bigint>>;
  logoDip721: ActorMethod<[], LogoResult>;
  metadata: ActorMethod<[TokenIdentifier], MetadataReturn>;
  mintDip721: ActorMethod<[Principal, MetadataDesc], MintReceipt>;
  name: ActorMethod<[], string>;
  nameDip721: ActorMethod<[], string>;
  ownerOfDip721: ActorMethod<[bigint], OwnerResult>;
  safeTransferFromDip721: ActorMethod<
    [Principal, Principal, bigint],
    TxReceipt
  >;
  supply: ActorMethod<[TokenIdentifier], BalanceReturn>;
  supportedInterfacesDip721: ActorMethod<[], Array<InterfaceId>>;
  symbolDip721: ActorMethod<[], string>;
  totalSupplyDip721: ActorMethod<[], bigint>;
  transfer: ActorMethod<[TransferRequest], TransferResponse>;
  transferFromDip721: ActorMethod<[Principal, Principal, bigint], TxReceipt>;
}

export interface _SERVICE extends erc721_token {}
