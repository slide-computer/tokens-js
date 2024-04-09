import type { MetadataValue } from "@slide-computer/tokens";
import type { GenericValue } from "./service";

export const genericValueToMetadataValue = (
  value: GenericValue,
): MetadataValue => {
  if ("NatContent" in value) {
    return { Nat: value.NatContent };
  }
  if ("Nat64Content" in value) {
    return { Nat: value.Nat64Content };
  }
  if ("Nat32Content" in value) {
    return { Nat: BigInt(value.Nat32Content) };
  }
  if ("Nat16Content" in value) {
    return { Nat: BigInt(value.Nat16Content) };
  }
  if ("Nat8Content" in value) {
    return { Nat: BigInt(value.Nat8Content) };
  }
  if ("IntContent" in value) {
    return { Int: value.IntContent };
  }
  if ("Int64Content" in value) {
    return { Int: value.Int64Content };
  }
  if ("Int32Content" in value) {
    return { Int: BigInt(value.Int32Content) };
  }
  if ("Int16Content" in value) {
    return { Int: BigInt(value.Int16Content) };
  }
  if ("Int8Content" in value) {
    return { Int: BigInt(value.Int8Content) };
  }
  if ("FloatContent" in value) {
    return { Text: `${value.FloatContent}` };
  }
  if ("BlobContent" in value) {
    return { Blob: value.BlobContent };
  }
  if ("NestedContent" in value) {
    return {
      Map: value.NestedContent.map((nested) => [
        nested[0],
        genericValueToMetadataValue(nested[1]),
      ]),
    };
  }
  if ("Principal" in value) {
    return { Text: value.Principal.toText() };
  }
  if ("TextContent" in value) {
    return { Text: value.TextContent };
  }

  throw Error("Unreachable");
};
