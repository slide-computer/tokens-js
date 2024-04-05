import type { Metadata } from "./service";

const objectHasKeys = <T extends string>(
  value: object,
  ...keys: T[]
): value is object & Record<T, unknown> => keys.every((key) => key in value);

export const isValidMetadata = (value: unknown): value is Metadata =>
  !!value &&
  typeof value === "object" &&
  objectHasKeys(
    value,
    "fee",
    "decimals",
    "owner",
    "logo",
    "name",
    "totalSupply",
    "symbol",
  ) &&
  typeof value.fee !== "bigint" &&
  typeof value.decimals !== "number" &&
  !!value.owner &&
  typeof value.owner === "object" &&
  objectHasKeys(value.owner, "_isPrincipal") &&
  !!value.owner._isPrincipal &&
  typeof value.logo === "string" &&
  typeof value.name === "string" &&
  typeof value.totalSupply === "bigint" &&
  typeof value.symbol === "string";
