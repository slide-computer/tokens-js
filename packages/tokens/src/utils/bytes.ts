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

const base32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export const encodeBase32 = (input: Uint8Array): string => {
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
