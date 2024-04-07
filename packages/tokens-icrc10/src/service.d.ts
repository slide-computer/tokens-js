import { ActorMethod } from "@dfinity/agent";

export interface _SERVICE {
  icrc10_supported_standards: ActorMethod<
    [],
    Array<{ url: string; name: string }>
  >;
}
