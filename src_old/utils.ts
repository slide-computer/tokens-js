import { Principal } from "@dfinity/principal";
import crc32 from "buffer-crc32";
import { Buffer } from "buffer";
import { Actor, HttpAgent } from "@dfinity/agent";
import { sha224 } from "@noble/hashes/sha256";
import { AccountType } from "./tokens/token";

export interface Account {
  owner: Principal;
  subaccount?: Uint8Array;
}

export const ICP_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const ACCOUNT_ID_SEP = new TextEncoder().encode("\x0Aaccount-id");

export const accountToString = (account: {
  owner: Principal;
  subaccount?: Uint8Array;
}): string => {
  if (
    !account.subaccount ||
    arraybufferEqual(
      account.subaccount.buffer,
      subaccountFromIndex(BigInt(0)).buffer
    )
  ) {
    return account.owner.toText();
  }
  const ownerMaxLength = 29;
  const ownerBytes = account.owner.toUint8Array().slice(0, ownerMaxLength);
  const checksumBytes = new Uint8Array(ownerBytes.length + 32);
  checksumBytes.set(ownerBytes);
  checksumBytes.set(account.subaccount, ownerBytes.length);
  const checksum = base32Encode(crc32(Buffer.from(checksumBytes)));
  const compressedSubaccount = Buffer.from(account.subaccount)
    .toString("hex")
    .replace(/^0+(.*)/, (_, hex) => hex);
  return `${account.owner.toText()}-${checksum}.${compressedSubaccount}`;
};

export const accountFromString = (str: string): Account => {
  if (isAccountHash(str)) {
    throw Error("Account hashes are not supported");
  }
  if (!str.includes(".")) {
    return { owner: Principal.fromText(str) };
  }
  const chunks = str.split("-");
  const [checksum, hexCompressedSubAccount] = chunks.pop()!.split(".");
  const compressedSubaccount = Uint8Array.from(
    Buffer.from(
      hexCompressedSubAccount.padStart(
        Math.ceil(hexCompressedSubAccount.length / 2) * 2,
        "0"
      ),
      "hex"
    )
  );
  const subaccount = new Uint8Array(32);
  subaccount.set(compressedSubaccount, 32 - compressedSubaccount.length);
  const owner = Principal.fromText(chunks.join("-"));
  const ownerMaxLength = 29;
  const ownerBytes = owner.toUint8Array().slice(0, ownerMaxLength);
  const checksumBytes = new Uint8Array(ownerBytes.length + 32);
  checksumBytes.set(ownerBytes);
  checksumBytes.set(subaccount, ownerBytes.length);
  if (base32Encode(crc32(Buffer.from(checksumBytes))) !== checksum) {
    throw Error("Account textual encoding has invalid checksum");
  }
  return { owner, subaccount };
};

export const accountToHash = (account: {
  owner: Principal;
  subaccount?: Uint8Array;
}): string => {
  const shaObj = sha224.create();
  shaObj.update(ACCOUNT_ID_SEP);
  shaObj.update(account.owner.toUint8Array());
  shaObj.update(account.subaccount ?? subaccountFromIndex(BigInt(0)));
  const hash = shaObj.digest();
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

export const subaccountToIndex = (subaccount: Uint8Array) => {
  return new DataView(subaccount.buffer).getBigUint64(24, false);
};

export const subaccountFromIndex = (index: bigint) => {
  const buffer = new ArrayBuffer(32);
  new DataView(buffer).setBigUint64(24, index, false);
  return new Uint8Array(buffer);
};

export const isAccountHash = (address: string) => {
  const buff = Buffer.from(address, "hex");
  const checksum = Buffer.from(buff.slice(0, 4));
  const hash = Buffer.from(buff.slice(4));
  const checksumFromHash = crc32(hash);
  return arraybufferEqual(checksum.buffer, checksumFromHash.buffer);
};

export const getAccountType = (value: string): AccountType | undefined => {
  if (isAccountHash(value)) {
    return "hash";
  }
  try {
    const account = accountFromString(value);
    return account.subaccount ? "account" : "principal";
  } catch (_) {}
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

export const bigintToUint64 = (
  bigint: bigint,
  littleEndian?: boolean
): Uint8Array => {
  let b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, bigint, littleEndian);
  return new Uint8Array(b);
};

export const bigintFromUint64 = (buffer: Uint8Array, littleEndian?: boolean) =>
  new DataView(buffer.buffer).getBigUint64(0, littleEndian);

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

export const base32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export const base32Encode = (input: Uint8Array): string => {
  // How many bits will we skip from the first byte.
  let skip = 0;
  // 5 high bits, carry from one byte to the next.
  let bits = 0;

  // The output string in base32.
  let output = "";

  function encodeByte(byte: number) {
    if (skip < 0) {
      // we have a carry from the previous byte
      bits |= byte >> -skip;
    } else {
      // no carry
      bits = (byte << skip) & 248;
    }

    if (skip > 3) {
      // Not enough data to produce a character, get us another one
      skip -= 8;
      return 1;
    }

    if (skip < 4) {
      // produce a character
      output += base32Alphabet[bits >> 3];
      skip += 5;
    }

    return 0;
  }

  for (let i = 0; i < input.length; ) {
    i += encodeByte(input[i]);
  }

  return output + (skip < 0 ? base32Alphabet[bits >> 3] : "");
};

export const intersect = (a: readonly string[], b: readonly string[]) => {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
};

export const actorOrigin = (actor: Actor, raw: boolean) => {
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
  try {
    const res = await fetch(url, { method: "HEAD" });
    return !!res.headers.get("Content-Type")?.startsWith("image/");
  } catch (_) {
    return false;
  }
};

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
