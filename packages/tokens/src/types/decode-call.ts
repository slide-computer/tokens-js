type ValuesOf<T> = T[keyof T];

export type DecodeCall<Methods> = {
  decodeCall(
    method: string,
    args: ArrayBuffer
  ):
    | ValuesOf<{
        [Method in keyof Methods]: {
          method: Method;
          args: Methods[Method] extends (...args: any[]) => any
            ? Parameters<Methods[Method]>
            : never;
        };
      }>
    | undefined;
};
