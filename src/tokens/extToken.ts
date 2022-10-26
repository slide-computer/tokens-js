import { TokenManagerConfig } from "../index";
import { Actor, ActorConfig, ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./ext/ext.did";
import { idlFactory } from "./ext";
import {
  accountHashFromString,
  accountToHash,
  actorHost,
  numberToUint32,
  subaccountFromIndex,
  urlIsImage,
} from "../utils";
import { BaseToken, Token } from "./token";
import { Principal } from "@dfinity/principal";
import { Buffer } from "buffer";

export const EXT_COMMON = "@ext/common";
export const EXT_NON_FUNGIBLE = "@ext/nonfungible";

export const ENTREPOT_COLLECTIONS_API =
  "https://us-central1-entrepot-api.cloudfunctions.net/api/collections";

export const tokenIdToExtTokenId = (canisterId: Principal, index: bigint) => {
  const padding = new Buffer("\x0Atid");
  const array = new Uint8Array([
    ...padding,
    ...canisterId.toUint8Array(),
    ...Array.from(numberToUint32(Number(index), false)),
  ]);
  return Principal.fromUint8Array(array).toText();
};

export class ExtToken extends BaseToken implements Partial<Token> {
  public static readonly implementedInterfaces = [EXT_COMMON, EXT_NON_FUNGIBLE];

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedInterfaces = [],
    ...actorConfig
  }: TokenManagerConfig) {
    super({ supportedInterfaces, ...actorConfig });
    this._actor = ExtToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedInterfaces.includes(EXT_COMMON)) {
      this.metadata = undefined;
      this.name = undefined;
      this.symbol = undefined;
      this.mintingAccount = undefined;
      this.balanceOf = undefined;
      this.transfer = undefined;
      this.logo = undefined;
    }
    if (!supportedInterfaces.includes(EXT_NON_FUNGIBLE)) {
      this.totalSupply = undefined;
      this.ownerOf = undefined;
      this.tokens = undefined;
      this.tokensOf = undefined;
      this.assetOf = undefined;
      this.thumbnailOf = undefined;
    }
  }

  public static create<T extends string>(config: TokenManagerConfig<T>) {
    return new ExtToken(config) as unknown as BaseToken &
      (T extends typeof EXT_COMMON
        ? Pick<
            Token,
            | "metadata"
            | "name"
            | "symbol"
            | "mintingAccount"
            | "balanceOf"
            | "transfer"
          >
        : {}) &
      (T extends typeof EXT_NON_FUNGIBLE
        ? Pick<Token, "totalSupply" | "ownerOf" | "tokens" | "tokensOf">
        : {});
  }

  public static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  public static async supportedStandards(
    config: ActorConfig
  ): Promise<Array<{ name: string; url: string }>> {
    try {
      return (
        await Actor.createActor<_SERVICE>(idlFactory, config).extensions()
      ).map((name) => ({
        name,
        url: "https://github.com/Toniq-Labs/extendable-token",
      }));
    } catch (_) {
      return [];
    }
  }

  public async metadata?() {
    return {
      [`${EXT_COMMON}:name`]: { Text: await this.name!() },
      [`${EXT_COMMON}:symbol`]: { Text: await this.symbol!() },
    };
  }

  public async name?() {
    // Grab collection name from index page with regex since the canister has no name or metadata method
    const res = await this._actor.http_request({
      body: [],
      headers: [],
      method: "GET",
      url: "/",
    });
    if (res.status_code === 200) {
      const re = /^(.+?)\n(?:EXT by|---)/;
      const body = new TextDecoder().decode(res.body as unknown as Uint8Array);
      const matches = re.exec(body);
      if (matches) {
        return matches[1];
      }
    }

    // Above might not always work since it's a hacky workaround at best,
    // this second attempt we check if the entrepot backend might contain the name
    try {
      const collections = await (
        await fetch(
          "https://us-central1-entrepot-api.cloudfunctions.net/api/collections"
        )
      ).json();
      const name = collections.find(
        (c: any) => c.id === Actor.canisterIdOf(this._actor).toText()
      )?.name;
      if (name) {
        return name;
      }
    } catch (_) {}

    return this._config.supportedInterfaces?.includes(EXT_NON_FUNGIBLE)
      ? "Collection"
      : "Token";
  }

  public async symbol?() {
    // Check if the entrepot backend might contain the symbol
    try {
      const collections = await (
        await fetch(
          "https://us-central1-entrepot-api.cloudfunctions.net/api/collections"
        )
      ).json();
      const unit = collections
        .find((c: any) => c.id === Actor.canisterIdOf(this._actor).toText())
        ?.unit?.trim();
      if (unit) {
        return unit
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .slice(unit.startsWith("IC") ? 2 : 0);
      }
    } catch (_) {}

    return this._config.supportedInterfaces?.includes(EXT_NON_FUNGIBLE)
      ? "NFT"
      : "TKN";
  }

  public async totalSupply?() {
    return BigInt((await this._actor.getTokens()).length);
  }

  public async mintingAccount?() {
    return (await this._actor.getMinter()).toText();
  }

  public async balanceOf?(account: string) {
    // Count tokens to get balance
    const res = await this._actor.tokens(account);
    if ("ok" in res) {
      return BigInt(res.ok.length);
    }
    return BigInt(0);
  }

  public async ownerOf?(tokenId: bigint) {
    // Get registry with all tokens and owners and return owner for token
    const res = await this._actor.getRegistry();
    return res.find(([id]) => id === Number(tokenId))?.[1];
  }

  public async tokens?() {
    return (await this._actor.getTokens()).map(([tokenId]) => BigInt(tokenId));
  }

  public async tokensOf?(account: string) {
    const res = await this._actor.tokens(account);
    if ("ok" in res) {
      res.ok.map((tokenId) => BigInt(tokenId));
    }
    return [];
  }

  public async transfer?(
    args: {
      to: string;
      fromSubaccount?: Uint8Array | number[] | bigint;
      memo?: Uint8Array | number[];
      createdAtTime?: bigint;
    } & ({ tokenId: bigint } | { amount: bigint })
  ): Promise<bigint> {
    const canisterId = Actor.canisterIdOf(this._actor);
    const from = await Actor.agentOf(this._actor)?.getPrincipal();
    if (!from) {
      throw Error("Agent with principal is required");
    }
    const res = await this._actor.transfer({
      amount: "amount" in args ? args.amount : BigInt(1),
      from: {
        address: accountToHash({
          owner: from,
          subaccount: args.fromSubaccount,
        }),
      },
      memo: args.memo ? (args.memo as number[]) : [0],
      notify: false,
      subaccount: args.fromSubaccount
        ? [
            (typeof args.fromSubaccount === "bigint"
              ? subaccountFromIndex(args.fromSubaccount)
              : args.fromSubaccount) as number[],
          ]
        : [],
      to: { address: accountHashFromString(args.to) },
      token:
        "tokenId" in args ? tokenIdToExtTokenId(canisterId, args.tokenId) : "",
    });
    if ("ok" in res) {
      // EXT does not return transaction id
      return BigInt(0);
    }
    throw Error(JSON.stringify(res.err));
  }

  public async icon?() {
    // TODO
    return "";
  }

  public async logo?() {
    try {
      const collections = await (await fetch(ENTREPOT_COLLECTIONS_API)).json();
      const canisterId = Actor.canisterIdOf(this._actor);
      const logoFromCanisterIdUrl = `https://entrepot.app/collections/${canisterId.toText()}.jpg`;
      const avatar = collections.find(
        (c: any) => c.id === Actor.canisterIdOf(this._actor).toText()
      )?.avatar;
      if (avatar) {
        if (avatar?.startsWith("https://") || avatar?.startsWith("http://")) {
          return avatar;
        }
        return `https://entrepot.app${avatar}`;
      }
      if (await urlIsImage(logoFromCanisterIdUrl)) {
        return logoFromCanisterIdUrl;
      }
    } catch (_) {}
  }

  public async assetOf?(tokenId: bigint) {
    const canisterId = Actor.canisterIdOf(this._actor);
    return `${actorHost(this._actor, true)}/?tokenid=${tokenIdToExtTokenId(
      canisterId,
      tokenId
    )}`;
  }

  public async thumbnailOf?(tokenId: bigint) {
    const canisterId = Actor.canisterIdOf(this._actor);
    return `${actorHost(this._actor, true)}/?tokenid=${tokenIdToExtTokenId(
      canisterId,
      tokenId
    )}&type=thumbnail`;
  }
}
