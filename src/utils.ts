import { Principal } from "@dfinity/principal";
import { sha224 } from "js-sha256";
import crc32 from "buffer-crc32";
import { Buffer } from "buffer";
import { Actor, Agent, HttpAgent } from "@dfinity/agent";
import { encode } from "@dfinity/principal/lib/cjs/utils/base32";

export interface Account {
  owner: Principal;
  subaccount?: Uint8Array;
}

export const ICP_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

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
  const checksum = encode(crc32(Buffer.from(checksumBytes)));
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
    Buffer.from(hexCompressedSubAccount, "hex")
  );
  const subaccount = new Uint8Array(32);
  subaccount.set(compressedSubaccount, 32 - compressedSubaccount.length);
  const owner = Principal.fromText(chunks.join("-"));
  const ownerMaxLength = 29;
  const ownerBytes = owner.toUint8Array().slice(0, ownerMaxLength);
  const checksumBytes = new Uint8Array(ownerBytes.length + 32);
  checksumBytes.set(ownerBytes);
  checksumBytes.set(subaccount, ownerBytes.length);
  if (encode(crc32(Buffer.from(checksumBytes))) !== checksum) {
    throw Error("Account textual encoding has invalid checksum");
  }
  return { owner, subaccount };
};

export const accountToHash = (account: {
  owner: Principal;
  subaccount?: Uint8Array;
}): string => {
  const shaObj = sha224.create();
  shaObj.update([
    ...Array.from("\x0Aaccount-id").map((c) => c.charCodeAt(0)),
    ...account.owner.toUint8Array(),
    ...(account.subaccount ?? subaccountFromIndex(BigInt(0))),
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

// This doesn't use new HttpAgent({ source: agent }) since that relies on instanceof which doesn't work
// across different http agent versions which are different classes and as a result don't match
export const makeHttpAgentAnonymous = (agent: Agent) => {
  const isHttpAgent = "_fetch" in agent && "_isAgent" in agent;
  if (isHttpAgent) {
    const anonymousAgent = new HttpAgent();
    // @ts-ignore
    anonymousAgent._pipeline = [...agent._pipeline];
    // @ts-ignore
    anonymousAgent._fetch = agent._fetch;
    // @ts-ignore
    anonymousAgent._host = agent._host;
    // @ts-ignore
    anonymousAgent._credentials = agent._credentials;

    return anonymousAgent;
  }
  return agent;
};
