import type { MetadataValue } from "../types";
import type { JsonValue } from "@dfinity/candid";
import { Buffer } from "buffer";

export const metadataValueToJsonValue = (value: MetadataValue): JsonValue => {
  if ("Blob" in value) {
    return Buffer.from(value.Blob).toString("base64");
  }
  if ("Text" in value) {
    return value.Text;
  }
  if ("Nat" in value) {
    return value.Nat >= Number.MIN_SAFE_INTEGER &&
      value.Nat <= Number.MAX_SAFE_INTEGER
      ? Number(value.Nat)
      : String(value.Nat);
  }
  if ("Int" in value) {
    return value.Int >= Number.MIN_SAFE_INTEGER &&
      value.Int <= Number.MAX_SAFE_INTEGER
      ? Number(value.Int)
      : String(value.Int);
  }
  if ("Array" in value) {
    return value.Array.map(metadataValueToJsonValue);
  }
  if ("Map" in value) {
    return Object.fromEntries(
      value.Map.map(([key, val]) => [key, metadataValueToJsonValue(val)]),
    );
  }
  throw Error("Unsupported variant in metadata value");
};
