import type { Principal } from "@dfinity/principal";
import { ActorMethod } from "@dfinity/agent";

export interface Metadata {
  fee: bigint;
  decimals: number;
  owner: Principal;
  logo: string;
  name: string;
  totalSupply: bigint;
  symbol: string;
}

export type Result = { Ok: bigint } | { Err: TxError };

export type TxError =
  | { InsufficientAllowance: null }
  | { InsufficientBalance: null }
  | { ErrorOperationStyle: null }
  | { Unauthorized: null }
  | { LedgerTrap: null }
  | { ErrorTo: null }
  | { Other: null }
  | { BlockUsed: null }
  | { AmountTooSmall: null };

export interface _SERVICE {
  allowance: ActorMethod<[Principal, Principal], bigint>;
  approve: ActorMethod<[Principal, bigint], Result>;
  balanceOf: ActorMethod<[Principal], bigint>;
  decimals: ActorMethod<[], number>;
  getMetadata: ActorMethod<[], Metadata>;
  historySize: ActorMethod<[], bigint>;
  logo: ActorMethod<[], string>;
  name: ActorMethod<[], string>;
  symbol: ActorMethod<[], string>;
  totalSupply: ActorMethod<[], bigint>;
  transfer: ActorMethod<[Principal, bigint], Result>;
  transferFrom: ActorMethod<[Principal, Principal, bigint], Result>;
}
