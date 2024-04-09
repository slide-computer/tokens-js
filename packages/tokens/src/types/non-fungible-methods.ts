import type { MetadataValue } from "./metadata";

export type CollectionApproval = {
  fromSubaccount?: ArrayBuffer;
  spender: string;
  expiresAt?: bigint;
  memo?: ArrayBuffer;
  createdAtTime?: bigint;
};

export type TokenApproval = CollectionApproval & {
  tokenId: bigint;
};

export type NonFungibleTokenMethods = {
  supplyCap(): Promise<bigint | undefined>;

  tokenMetadata(
    tokenId: bigint
  ): Promise<Array<[string, MetadataValue]> | undefined>;

  ownerOf(tokenId: bigint): Promise<string | undefined>;

  tokens(prev?: bigint, take?: bigint): Promise<bigint[]>;

  tokensOf(account: string, prev?: bigint, take?: bigint): Promise<bigint[]>;

  transferToken(args: {
    tokenId: bigint;
    fromSubaccount?: ArrayBuffer;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint>;

  transferTokenFrom(args: {
    tokenId: bigint;
    spenderSubaccount?: ArrayBuffer;
    from: string;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint>;

  approveToken(args: TokenApproval): Promise<bigint>;

  approveCollection(args: CollectionApproval): Promise<bigint>;

  revokeTokenApproval(args: Omit<TokenApproval, "expiresAt">): Promise<bigint>;

  revokeCollectionApproval(
    args: Omit<CollectionApproval, "expiresAt">
  ): Promise<bigint>;

  isApproved(args: {
    tokenId: bigint;
    fromSubaccount?: ArrayBuffer;
    spender?: string;
  }): Promise<boolean>;

  getTokenApprovals(
    tokenId: bigint,
    prev?: TokenApproval,
    take?: bigint
  ): Promise<TokenApproval>;

  getCollectionApprovals(
    owner: string,
    prev?: CollectionApproval,
    take?: bigint
  ): Promise<CollectionApproval>;
};
