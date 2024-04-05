export const idlFactory = ({ IDL }) => {
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(Subaccount),
  });
  const Value = IDL.Variant({
    Int: IDL.Int,
    Nat: IDL.Nat,
    Blob: IDL.Vec(IDL.Nat8),
    Text: IDL.Text,
  });
  const TokenId = IDL.Nat;
  const TransferArgs = IDL.Record({
    to: Account,
    token_id: TokenId,
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(Subaccount),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const TransferError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    NotFound: IDL.Null,
    NotOwner: IDL.Null,
  });
  const SetApprovalArgs = IDL.Record({
    token_id: TokenId,
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(Subaccount),
    approved: IDL.Bool,
    created_at_time: IDL.Opt(IDL.Nat64),
    spender: IDL.Principal,
  });
  const SetApprovalError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    MaxApprovals: IDL.Nat,
    NotFound: IDL.Null,
    NotOwner: IDL.Null,
  });
  const SetApprovalForAllArgs = IDL.Record({
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(Subaccount),
    approved: IDL.Bool,
    created_at_time: IDL.Opt(IDL.Nat64),
    spender: IDL.Principal,
  });
  const SetApprovalForAllError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    MaxApprovals: IDL.Nat,
  });
  const TransferFromArgs = IDL.Record({
    to: Account,
    token_id: TokenId,
    from: Account,
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const TransferFromError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    NotFound: IDL.Null,
    NotOwner: IDL.Null,
    NotApproved: IDL.Null,
  });
  const MintArgs = IDL.Record({
    to: Account,
    token_id: TokenId,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const MintError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    NotAllowed: IDL.Null,
  });
  const BurnArgs = IDL.Record({
    token_id: TokenId,
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const BurnError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    NotAllowed: IDL.Null,
  });
  const SetCustodianArgs = IDL.Record({
    approved: IDL.Bool,
    custodian: IDL.Principal,
  });
  const SetCustodiansError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    NotAllowed: IDL.Null,
    MaxCustodians: IDL.Nat,
  });
  const RoyaltyFee = IDL.Record({ fee: IDL.Nat, account: Account });
  const SetRoyaltyFeeArgs = IDL.Record({
    fee: IDL.Float64,
    account: Account,
  });
  const SetRoyaltyFeeError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    NotAllowed: IDL.Null,
  });
  return IDL.Service({
    sld1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
    sld1_metadata: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Text, Value))],
      ["query"]
    ),
    sld1_metadata_of: IDL.Func(
      [TokenId],
      [IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, Value)))],
      ["query"]
    ),
    sld1_minting_account: IDL.Func([], [Account], ["query"]),
    sld1_name: IDL.Func([], [IDL.Text], ["query"]),
    sld1_owner_of: IDL.Func([TokenId], [IDL.Opt(Account)], ["query"]),
    sld1_supported_standards: IDL.Func(
      [],
      [IDL.Vec(IDL.Record({ url: IDL.Text, name: IDL.Text }))],
      []
    ),
    sld1_symbol: IDL.Func([], [IDL.Text], ["query"]),
    sld1_tokens: IDL.Func([IDL.Nat], [IDL.Vec(TokenId)], ["query"]),
    sld1_tokens_of: IDL.Func([Account, IDL.Nat], [IDL.Vec(TokenId)], ["query"]),
    sld1_total_supply: IDL.Func([], [IDL.Nat], ["query"]),
    sld1_transfer: IDL.Func(
      [TransferArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: TransferError })],
      []
    ),
    sld2_get_approved: IDL.Func([TokenId], [IDL.Vec(IDL.Principal)], ["query"]),
    sld2_set_approval: IDL.Func(
      [SetApprovalArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: SetApprovalError })],
      []
    ),
    sld2_set_approval_for_all: IDL.Func(
      [SetApprovalForAllArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: SetApprovalForAllError })],
      []
    ),
    sld2_transfer_from: IDL.Func(
      [TransferFromArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: TransferFromError })],
      []
    ),
    sld4_mint: IDL.Func(
      [MintArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: MintError })],
      []
    ),
    sld5_burn: IDL.Func(
      [BurnArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: BurnError })],
      []
    ),
    sld6_get_custodians: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    sld6_set_custodian: IDL.Func(
      [SetCustodianArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: SetCustodiansError })],
      []
    ),
    sld7_royalty_fee: IDL.Func([IDL.Nat], [RoyaltyFee], ["query"]),
    sld8_set_royalty_fee: IDL.Func(
      [SetRoyaltyFeeArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: SetRoyaltyFeeError })],
      []
    ),
  });
};
export const init = ({ IDL }) => {
  return [];
};
