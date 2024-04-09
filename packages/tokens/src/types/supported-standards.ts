import type { ActorConfig } from "@dfinity/agent";

export type SupportedStandards = {
  supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>>;
};

export type SupportedStandardsWithoutConfig = {
  supportedStandards(): Promise<Array<{ name: string; url: string }>>;
};
