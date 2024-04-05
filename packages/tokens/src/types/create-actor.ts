import type { ActorConfig, ActorSubclass } from "@dfinity/agent";

export type CreateActor<T> = {
  createActor(config: ActorConfig): ActorSubclass<T>;
};
