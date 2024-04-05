export type MetadataValue =
  | { Blob: Uint8Array }
  | { Text: string }
  | { Nat: bigint }
  | { Int: bigint }
  | { Array: MetadataValue[] }
  | { Map: Array<[string, MetadataValue]> };
