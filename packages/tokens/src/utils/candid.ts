import { IDL } from "@dfinity/candid";
import type { ActorMethod } from "@dfinity/agent";

export const createCandidDecoder = <S extends object = never>(
  idlFactory: (args: { IDL: typeof IDL }) => IDL.ServiceClass,
) => {
  const serviceClass = idlFactory({ IDL });
  const decodeArgs = <
    M extends string,
    R = S extends Record<M, ActorMethod<infer A>> ? A : never,
  >(
    methodName: M,
    args: ArrayBuffer,
  ): R => {
    const funcClass = serviceClass._fields.find(
      ([method_name]) => method_name === methodName,
    )?.[1];
    if (!funcClass) {
      throw Error("Request method not found in IDL");
    }
    return IDL.decode(funcClass.argTypes, args) as R;
  };
  return { decodeArgs };
};
