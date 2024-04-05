import {
  type CollectionApproval,
  type CreateActor,
  decodeAccount,
  type DecodeCall,
  decodeCbor,
  type ImplementedStandards,
  type NonFungibleTokenMethods,
  type SupportedStandards,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";

type Methods = Pick<
  NonFungibleTokenMethods,
  "transferTokenFrom" | "approveCollection" | "revokeCollectionApproval"
>;

export const Dip721V2Approval = class implements Methods {
  static implementedStandards = ["DIP-721-V2-APPROVAL"] as const;

  #config: TokenConfig;
  #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Dip721V2Approval.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(config: ActorConfig) {
    const supportedInterfaces = await this.createActor(config)
      .dip721_supported_interfaces()
      .catch(() => false);

    if (
      !Array.isArray(supportedInterfaces) ||
      !supportedInterfaces.find(
        (supportedInterface) => "Approval" in supportedInterface,
      )
    ) {
      return [];
    }

    return [
      {
        name: "DIP-721-V2-APPROVAL",
        url: "https://github.com/Psychedelic/DIP721",
      },
    ];
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    switch (method) {
      case "dip721_transfer_from": {
        const [from, to, tokenId] =
          decodeCbor<Parameters<_SERVICE["dip721_transfer_from"]>>(args);
        return {
          method: "transferTokenFrom",
          args: [{ from: from.toText(), to: to.toText(), tokenId }],
        };
      }
      case "dip721_set_approval_for_all": {
        const [spender, approve] =
          decodeCbor<Parameters<_SERVICE["dip721_set_approval_for_all"]>>(args);
        return {
          method: approve ? "approveCollection" : "revokeCollectionApproval",
          args: [{ spender: spender.toText() }],
        };
      }
    }
  }

  async transferTokenFrom(args: {
    tokenId: bigint;
    from: string;
    to: string;
  }): Promise<bigint> {
    const res = await this.#actor.dip721_transfer_from(
      decodeAccount(args.from).owner,
      decodeAccount(args.to).owner,
      args.tokenId,
    );
    if ("Err" in res) {
      throw Error(JSON.stringify(res.Err));
    }
    return res.Ok;
  }

  async approveCollection(args: CollectionApproval): Promise<bigint> {
    const res = await this.#actor.dip721_set_approval_for_all(
      decodeAccount(args.spender).owner,
      true,
    );
    if ("Err" in res) {
      throw Error(JSON.stringify(res.Err));
    }
    return res.Ok;
  }

  async revokeCollectionApproval(
    args: Omit<CollectionApproval, "expiresAt">,
  ): Promise<bigint> {
    const res = await this.#actor.dip721_set_approval_for_all(
      decodeAccount(args.spender).owner,
      false,
    );
    if ("Err" in res) {
      throw Error(JSON.stringify(res.Err));
    }
    return res.Ok;
  }
} satisfies SupportedStandards &
  ImplementedStandards &
  CreateActor<_SERVICE> &
  DecodeCall<Methods>;
