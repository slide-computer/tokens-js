import type { MetadataValue } from "./metadata";
import type { CollectionApproval, TokenApproval } from "./non-fungible-methods";

export type NonFungibleTokenBatchMethods = {
  batchTokenMetadata(
    tokenIds: bigint[],
  ): Promise<Array<Array<[string, MetadataValue]> | undefined>>;

  batchOwnerOf(tokenIds: bigint[]): Promise<Array<string | undefined>>;

  batchTransferToken(
    args: Array<{
      tokenId: bigint;
      fromSubaccount?: ArrayBuffer;
      to: string;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>>;

  batchTransferTokenFrom(
    args: Array<{
      tokenId: bigint;
      spenderSubaccount?: ArrayBuffer;
      from: string;
      to: string;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>>;

  batchApproveToken(args: TokenApproval[]): Array<Promise<bigint | undefined>>;

  batchApproveCollection(
    args: CollectionApproval[],
  ): Array<Promise<bigint | undefined>>;

  batchRevokeTokenApproval(
    args: Array<Omit<TokenApproval, "expiresAt">>,
  ): Array<Promise<bigint | undefined>>;

  batchRevokeCollectionApproval(
    args: Array<Omit<CollectionApproval, "expiresAt">>,
  ): Array<Promise<bigint | undefined>>;

  batchIsApproved(
    args: Array<{
      tokenId: bigint;
      fromSubaccount?: ArrayBuffer;
      spender?: string;
    }>,
  ): Promise<boolean[]>;
};
