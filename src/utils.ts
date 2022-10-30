import { Principal } from "@dfinity/principal";
import { sha224 } from "js-sha256";
import crc32 from "buffer-crc32";
import { Buffer } from "buffer";
import { Actor, HttpAgent } from "@dfinity/agent";

export interface Account {
  owner: Principal;
  subaccount?: number[];
}

export const ICP_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

export const accountToString = (account: {
  owner: Principal | string;
  subaccount?: Uint8Array | number[] | bigint;
}): string => {
  const subaccount =
    typeof account.subaccount === "bigint"
      ? subaccountFromIndex(account.subaccount)
      : Array.isArray(account.subaccount)
      ? account.subaccount
      : Array.from(account.subaccount ?? []);
  const index = subaccount.findIndex((value) => value !== 0);
  if (index === -1) {
    return typeof account.owner === "string"
      ? account.owner
      : account.owner.toText();
  }
  return Principal.fromUint8Array(
    new Uint8Array([
      ...(typeof account.owner === "string"
        ? Principal.fromText(account.owner)
        : account.owner
      ).toUint8Array(),
      ...subaccount.slice(index),
      subaccount.length - index,
      127,
    ])
  ).toText();
};

export const accountFromString = (str: string): Account => {
  if (isAccountHash(str)) {
    throw Error("Account hashes are not supported");
  }
  const principal = Principal.fromText(str);
  const array = Array.from(principal.toUint8Array());
  if (array[array.length - 1] !== 127) {
    return { owner: principal };
  }
  if (array[array.length - 2] === 0 || array[array.length - 2] > 32) {
    throw Error("Invalid account");
  }
  return {
    owner: Principal.fromUint8Array(
      Uint8Array.from(array.slice(0, -array[array.length - 2] - 2))
    ),
    subaccount: [
      ...Array.from<number>({ length: 32 - array[array.length - 2] }).fill(0),
      ...array.slice(-array[array.length - 2] - 2, -2),
    ],
  };
};

export const accountToHash = (account: {
  owner: Principal | string;
  subaccount?: Uint8Array | number[] | bigint;
}): string => {
  const shaObj = sha224.create();
  shaObj.update([
    ...Array.from("\x0Aaccount-id").map((c) => c.charCodeAt(0)),
    ...(typeof account.owner === "string"
      ? Principal.fromText(account.owner)
      : account.owner
    ).toUint8Array(),
    ...(account.subaccount
      ? typeof account.subaccount === "bigint"
        ? subaccountFromIndex(account.subaccount)
        : account.subaccount
      : subaccountFromIndex(BigInt(0))),
  ]);
  const hash = new Uint8Array(shaObj.array());
  const checksum = crc32(Buffer.from(hash));
  return Buffer.from(new Uint8Array([...checksum, ...hash])).toString("hex");
};

export const accountHashFromString = (str: string): string => {
  if (isAccountHash(str)) {
    return str;
  }
  return accountToHash(accountFromString(str));
};

export const principalFromString = (str: string): Principal => {
  if (isAccountHash(str)) {
    throw Error("Account hashes are not supported");
  }
  return accountFromString(str).owner;
};

export const subaccountToIndex = (
  subaccount: Uint8Array | number[],
  littleEndian?: boolean
) => {
  return new DataView(
    Array.isArray(subaccount) ? Uint8Array.from(subaccount) : subaccount
  ).getBigUint64(24, littleEndian);
};

export const subaccountFromIndex = (index: bigint) => {
  const buffer = new ArrayBuffer(32);
  new DataView(buffer).setBigUint64(24, index);
  return Array.from(new Uint8Array(buffer));
};

export const isAccountHash = (address: string) => {
  const buff = Buffer.from(address, "hex");
  const checksum = Buffer.from(buff.slice(0, 4));
  const hash = Buffer.from(buff.slice(4));
  const checksumFromHash = crc32(hash);
  return arraybufferEqual(checksum.buffer, checksumFromHash.buffer);
};

export const numberToUint32 = (
  num: number,
  littleEndian?: boolean
): Uint8Array => {
  let b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num, littleEndian);
  return new Uint8Array(b);
};

export const numberFromUint32 = (buffer: Uint8Array, littleEndian?: boolean) =>
  new DataView(buffer.buffer).getUint32(0, littleEndian);

export const arraybufferEqual = (buf1: ArrayBuffer, buf2: ArrayBuffer) => {
  if (buf1 === buf2) {
    return true;
  }

  if (buf1.byteLength !== buf2.byteLength) {
    return false;
  }

  const view1 = new DataView(buf1);
  const view2 = new DataView(buf2);

  let i = buf1.byteLength;
  while (i--) {
    if (view1.getUint8(i) !== view2.getUint8(i)) {
      return false;
    }
  }

  return true;
};

export const intersect = (a: readonly string[], b: readonly string[]) => {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
};

export const actorHost = (actor: Actor, raw: boolean) => {
  const agent = Actor.agentOf(actor);
  const canisterId = Actor.canisterIdOf(actor);
  return agent instanceof HttpAgent && agent.isLocal()
    ? agent["_host"].origin // Use internal private property host from agent
    : `https://${canisterId}${raw ? ".raw" : ""}.ic0.app`;
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
  const res = await fetch(url, { method: "HEAD" });
  return !!res.headers.get("Content-Type")?.startsWith("image/");
};

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
