import {
  type CreateActor,
  type ImplementedStandards,
  type SupportedStandards,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";

export const Icrc10 = class {
  static implementedStandards = ["ICRC-10"] as const;

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(config: ActorConfig) {
    return this.createActor(config)
      .icrc10_supported_standards()
      .catch(() => []);
  }
} satisfies SupportedStandards & ImplementedStandards & CreateActor<_SERVICE>;
