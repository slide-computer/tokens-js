import { Principal } from "@dfinity/principal";
import { arraybufferEqual, encodeBase32 } from "./bytes";
import { Buffer } from "buffer";
import { sha224 } from "@noble/hashes/sha256";
import { crc32 } from "./crc32";

export type Account = {
  owner: Principal;
  subaccount?: ArrayBuffer;
};
const ACCOUNT_ID_SEP = new TextEncoder().encode("\x0Aaccount-id");

export const encodeSubaccount = (index: bigint): ArrayBuffer => {
  const buffer = new ArrayBuffer(32);
  new DataView(buffer).setBigUint64(24, index, false);
  return buffer;
};

export const decodeSubaccount = (subaccount: ArrayBuffer): bigint => {
  return new DataView(subaccount).getBigUint64(24, false);
};

export const encodeAccount = (account: Account): string => {
  if (
    !account.subaccount ||
    arraybufferEqual(account.subaccount, encodeSubaccount(BigInt(0)))
  ) {
    return account.owner.toText();
  }
  const ownerMaxLength = 29;
  const ownerBytes = account.owner.toUint8Array().slice(0, ownerMaxLength);
  const checksumBytes = new Uint8Array(ownerBytes.length + 32);
  checksumBytes.set(ownerBytes);
  checksumBytes.set(new Uint8Array(account.subaccount), ownerBytes.length);
  const checksum = encodeBase32(crc32(Buffer.from(checksumBytes)));
  const compressedSubaccount = Buffer.from(account.subaccount)
    .toString("hex")
    .replace(/^0+(.*)/, (_, hex) => hex);
  return `${account.owner.toText()}-${checksum}.${compressedSubaccount}`;
};

export const hashAccount = (account: Account): string => {
  const hasher = sha224.create();
  hasher.update(ACCOUNT_ID_SEP);
  hasher.update(account.owner.toUint8Array());
  hasher.update(
    new Uint8Array(account.subaccount ?? encodeSubaccount(BigInt(0))),
  );
  const hash = hasher.digest();
  const checksum = crc32(Buffer.from(hash));
  return Buffer.from(new Uint8Array([...checksum, ...hash])).toString("hex");
};

export const isAccountHash = (accountAddress: string) => {
  const buffer = Buffer.from(accountAddress, "hex");
  const checksum = buffer.subarray(0, 4);
  const hash = buffer.subarray(4);
  const checksumFromHash = crc32(Buffer.from(hash));
  return arraybufferEqual(checksum.buffer, checksumFromHash.buffer);
};

export const decodeAccount = (accountAddress: string): Account => {
  if (isAccountHash(accountAddress)) {
    throw Error("Account hashes cannot be decoded");
  }
  if (!accountAddress.includes(".")) {
    return { owner: Principal.fromText(accountAddress) };
  }
  const chunks = accountAddress.split("-");
  const [checksum, hexCompressedSubAccount] = chunks.pop()!.split(".");
  const compressedSubaccount = Uint8Array.from(
    Buffer.from(
      hexCompressedSubAccount.padStart(
        Math.ceil(hexCompressedSubAccount.length / 2) * 2,
        "0",
      ),
      "hex",
    ),
  );
  const subaccount = new Uint8Array(32);
  subaccount.set(compressedSubaccount, 32 - compressedSubaccount.length);
  const owner = Principal.fromText(chunks.join("-"));
  const ownerMaxLength = 29;
  const ownerBytes = owner.toUint8Array().slice(0, ownerMaxLength);
  const checksumBytes = new Uint8Array(ownerBytes.length + 32);
  checksumBytes.set(ownerBytes);
  checksumBytes.set(subaccount, ownerBytes.length);
  if (encodeBase32(crc32(Buffer.from(checksumBytes))) !== checksum) {
    throw Error("Account address has invalid checksum");
  }
  return { owner, subaccount };
};

export const isAccount = (accountAddress: string) => {
  try {
    decodeAccount(accountAddress);
    return true;
  } catch {
    return false;
  }
};
