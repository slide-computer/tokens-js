export const idlFactory = ({ IDL }) => {
  const TxError = IDL.Variant({
    InsufficientAllowance: IDL.Null,
    InsufficientBalance: IDL.Null,
    ErrorOperationStyle: IDL.Null,
    Unauthorized: IDL.Null,
    LedgerTrap: IDL.Null,
    ErrorTo: IDL.Null,
    Other: IDL.Null,
    BlockUsed: IDL.Null,
    AmountTooSmall: IDL.Null,
  });
  const Result = IDL.Variant({ Ok: IDL.Nat, Err: TxError });
  const Metadata = IDL.Record({
    fee: IDL.Nat,
    decimals: IDL.Nat8,
    owner: IDL.Principal,
    logo: IDL.Text,
    name: IDL.Text,
    totalSupply: IDL.Nat,
    symbol: IDL.Text,
  });
  return IDL.Service({
    allowance: IDL.Func([IDL.Principal, IDL.Principal], [IDL.Nat], ["query"]),
    approve: IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    balanceOf: IDL.Func([IDL.Principal], [IDL.Nat], ["query"]),
    decimals: IDL.Func([], [IDL.Nat8], ["query"]),
    getMetadata: IDL.Func([], [Metadata], ["query"]),
    historySize: IDL.Func([], [IDL.Nat64], ["query"]),
    logo: IDL.Func([], [IDL.Text], ["query"]),
    name: IDL.Func([], [IDL.Text], ["query"]),
    symbol: IDL.Func([], [IDL.Text], ["query"]),
    totalSupply: IDL.Func([], [IDL.Nat], ["query"]),
    transfer: IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    transferFrom: IDL.Func(
      [IDL.Principal, IDL.Principal, IDL.Nat],
      [Result],
      []
    ),
  });
};
export const init = ({ IDL }) => {
  return [
    IDL.Text,
    IDL.Text,
    IDL.Text,
    IDL.Nat8,
    IDL.Nat,
    IDL.Principal,
    IDL.Nat,
    IDL.Principal,
    IDL.Principal,
  ];
};
