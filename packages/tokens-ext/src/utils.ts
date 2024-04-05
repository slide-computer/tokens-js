import { Principal } from "@dfinity/principal";
import { Buffer } from "buffer";

export const getCollections = async (): Promise<
  Array<{
    id: string;
    name?: string;
    unit?: string;
    avatar?: string;
    owner?: string;
  }>
> => {
  const res = await fetch(
    "https://us-central1-entrepot-api.cloudfunctions.net/api/collections",
  );
  return res.json();
};

export const urlIsImage = async (url: string): Promise<boolean> => {
  // Web can't use fetch in the browser due to possibly running into CORS
  if (window?.Image) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  // This isn't an issue outside the browser
  try {
    const res = await fetch(url, { method: "HEAD" });
    return !!res.headers.get("Content-Type")?.startsWith("image/");
  } catch (_) {
    return false;
  }
};

type AttributeValueIndex = number;
type AttributeValueLabel = string;
type AttributeValue = [AttributeValueIndex, AttributeValueLabel];
type AttributeIndex = number;
type AttributeLabel = string;
type AttributeEntry = [AttributeIndex, AttributeLabel, AttributeValue[]];
type TokenAttribute = [AttributeIndex, AttributeValueIndex];
type TokenIndex = number;
type TokenEntry = [TokenIndex, TokenAttribute[]];
type Filters = [AttributeEntry[], TokenEntry[]];

export const getCollectionFilters = async (
  canisterId: Principal,
): Promise<Filters | undefined> => {
  try {
    const res = await fetch(
      `https://corsproxy.io/?https://toniq.io/filter/${canisterId.toText()}.json()`,
    );
    return res.json();
  } catch (_) {}
};

const numberToUint32 = (num: number, littleEndian?: boolean): Uint8Array => {
  let b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num, littleEndian);
  return new Uint8Array(b);
};

const numberFromUint32 = (buffer: Uint8Array, littleEndian?: boolean) =>
  new DataView(buffer.buffer).getUint32(0, littleEndian);

export const tokenIndexToId = (canisterId: Principal, index: bigint) => {
  const padding = new Buffer("\x0Atid");
  const array = new Uint8Array([
    ...padding,
    ...canisterId.toUint8Array(),
    ...Array.from(numberToUint32(Number(index), false)),
  ]);
  return Principal.fromUint8Array(array);
};

export const tokenIndexFromId = (id: Principal) => {
  const bytes = id.toUint8Array();
  const padding = Uint8Array.from(new Buffer("\x0Atid"));
  if (
    bytes.length < padding.length ||
    !padding.every((byte, index) => byte === bytes[index])
  ) {
    throw Error("Invalid ext token id");
  }
  return BigInt(numberFromUint32(bytes.slice(-4), false));
};
