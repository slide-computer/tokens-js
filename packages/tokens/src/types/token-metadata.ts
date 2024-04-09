import type { JsonValue } from "@dfinity/candid";
import type { MetadataValue } from "./metadata";

export type Attribute = {
  value: JsonValue;
  traitType: string;
  displayType?: string;
};

export type TokenMetadataToName = {
  /** @return Name of item */
  tokenMetadataToName(
    metadata: Array<[string, MetadataValue]>,
  ): string | undefined;
};

export type TokenMetadataToDescription = {
  /** @return Plain text or Markdown */
  tokenMetadataToDescription(
    metadata: Array<[string, MetadataValue]>,
  ): string | undefined;
};

export type TokenMetadataToImage = {
  /** @return Image URI with http, data or other protocol  */
  tokenMetadataToImage(
    metadata: Array<[string, MetadataValue]>,
  ): string | undefined;
};

export type TokenMetadataToUrl = {
  /** @return Http URL to view item */
  tokenMetadataToUrl(
    metadata: Array<[string, MetadataValue]>,
  ): string | undefined;
};

export type TokenMetadataToAttributes = {
  /** @return List of attributes following the OpenSea metadata standard  */
  tokenMetadataToAttributes(
    metadata: Array<[string, MetadataValue]>,
  ): Attribute[] | undefined;
};

export type TokenMetadataMethods = TokenMetadataToName &
  TokenMetadataToDescription &
  TokenMetadataToImage &
  TokenMetadataToUrl &
  TokenMetadataToAttributes;
