import {
  bigintToUint64,
  IdentifiedCall,
  numberFromUint32,
  subaccountFromIndex,
  TokenManagerConfig,
} from "../index";
import { Actor, ActorConfig, ActorSubclass, HttpAgent } from "@dfinity/agent";
import { _SERVICE } from "./ext/ext.did";
import { idlFactory } from "./ext";
import {
  accountHashFromString,
  accountToHash,
  actorOrigin,
  numberToUint32,
  urlIsImage,
} from "../utils";
import { BaseToken, Token } from "./token";
import { Principal } from "@dfinity/principal";
import { Buffer } from "buffer";
import { Value } from "./icrc1/icrc1.did";

export const EXT_COMMON = "@ext/common";
export const EXT_NON_FUNGIBLE = "@ext/nonfungible";
export type EXT_TYPE = typeof EXT_COMMON | typeof EXT_NON_FUNGIBLE;

export const ENTREPOT_COLLECTIONS_API =
  "https://us-central1-entrepot-api.cloudfunctions.net/api/collections";
export const ENTREPOT_FILTERS_API =
  "https://corsproxy.io/?https://entrepot.app/filter"; // Cors proxy is needed since CORS headers are missing

export const tokenIdToExtTokenId = (canisterId: Principal, index: bigint) => {
  const padding = new Buffer("\x0Atid");
  const array = new Uint8Array([
    ...padding,
    ...canisterId.toUint8Array(),
    ...Array.from(numberToUint32(Number(index), false)),
  ]);
  return Principal.fromUint8Array(array);
};

export const tokenIdTFromExtTokenId = (id: Principal) => {
  const bytes = id.toUint8Array();
  const padding = Uint8Array.from(new Buffer("\x0Atid"));
  if (
    bytes.length < padding.length ||
    !padding.every((byte, index) => byte === bytes[index])
  ) {
    throw Error("Invalid ext token id");
  }
  return BigInt(numberFromUint32(bytes.slice(-4), false));
};

export type ExtMethods<T extends string | undefined = undefined> =
  (T extends typeof EXT_COMMON
    ? Pick<
        Token,
        | "metadata"
        | "name"
        | "symbol"
        | "mintingAccount"
        | "balanceOf"
        | "transfer"
        | "logo"
      >
    : {}) &
    (T extends typeof EXT_NON_FUNGIBLE
      ? Pick<
          Token,
          | "totalSupply"
          | "ownerOf"
          | "tokens"
          | "tokensOf"
          | "assetOf"
          | "imageOf"
          | "attributesOf"
        >
      : {});

export class ExtToken extends BaseToken implements Partial<Token> {
  static implementedStandards = [EXT_COMMON, EXT_NON_FUNGIBLE] as const;
  static accountType = "hash" as const;

  private readonly _actor: ActorSubclass<_SERVICE>;

  protected constructor({
    supportedStandards = [],
    ...actorConfig
  }: TokenManagerConfig<string>) {
    super({ supportedStandards, ...actorConfig });
    this._actor = ExtToken.createActor(actorConfig);

    // Disable methods for unsupported standards
    if (!supportedStandards.includes(EXT_COMMON)) {
      this.metadata = undefined;
      this.name = undefined;
      this.symbol = undefined;
      this.mintingAccount = undefined;
      this.balanceOf = undefined;
      this.transfer = undefined;
      this.logo = undefined;
    }
    if (!supportedStandards.includes(EXT_NON_FUNGIBLE)) {
      this.totalSupply = undefined;
      this.ownerOf = undefined;
      this.tokens = undefined;
      this.tokensOf = undefined;
      this.assetOf = undefined;
      this.imageOf = undefined;
      this.attributesOf = undefined;
    }
  }

  static create<T extends string>(config: TokenManagerConfig<T>) {
    return new ExtToken(config) as unknown as BaseToken & ExtMethods<T>;
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static async supportedStandards(
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

  static tokenType(supportedStandards: string[]) {
    if (supportedStandards.includes(EXT_NON_FUNGIBLE)) {
      return "nonFungible";
    }
    return "fungible" as const;
  }

  static identifyCall(
    methodName: string,
    args: any[]
  ): IdentifiedCall | undefined {
    switch (methodName) {
      case "transfer":
        return {
          methodName: "transfer",
          args: [
            {
              to: args[0].to.address,
              amount: args[0].amount,
              tokenId: (args[0].token
                ? tokenIdTFromExtTokenId(Principal.fromText(args[0].token))
                : undefined) as any,
              memo: args[0].memo,
            },
          ],
        };
    }
  }

  async metadata?() {
    return [
      [`${EXT_COMMON}:name`, { Text: await this.name!() }],
      [`${EXT_COMMON}:symbol`, { Text: await this.symbol!() }],
      [`${EXT_COMMON}:total_supply`, { Text: await this.totalSupply!() }],
    ] as Array<[string, Value]>;
  }

  async name?() {
    // Grab collection name from index page with regex since the canister has no name or metadata method
    const res = await this._actor.http_request({
      body: new Uint8Array(),
      headers: [],
      method: "GET",
      url: "/",
    });

    // Exceptions that do not return a correct name
    switch (Actor.canisterIdOf(this._actor).toText()) {
      case "oeee4-qaaaa-aaaak-qaaeq-cai":
        return "Motoko Ghosts";
      case "bzsui-sqaaa-aaaah-qce2a-cai":
        return "Poked Bots";
      case "dhiaa-ryaaa-aaaae-qabva-cai":
        return "ETH Flower";
    }

    // Get name from canister status page
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

    return this._config.supportedStandards?.includes(EXT_NON_FUNGIBLE)
      ? "Non-fungible token"
      : "Token";
  }

  async symbol?() {
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

    return this._config.supportedStandards?.includes(EXT_NON_FUNGIBLE)
      ? "NFT"
      : "TKN";
  }

  async totalSupply?() {
    return BigInt((await this._actor.getTokens()).length);
  }

  async mintingAccount?() {
    return (await this._actor.getMinter()).toText();
  }

  async balanceOf?(account: string) {
    // Count tokens to get balance
    const res = await this._actor.tokens(accountHashFromString(account));
    if ("ok" in res) {
      return BigInt(res.ok.length);
    }
    return BigInt(0);
  }

  async ownerOf?(tokenId: bigint) {
    // Get registry with all tokens and owners and return owner for token
    const res = await this._actor.getRegistry();
    return res.find(([id]) => id === Number(tokenId))?.[1];
  }

  async tokens?() {
    return (await this._actor.getTokens())
      .map(([tokenId]) => BigInt(tokenId))
      .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
  }

  async tokensOf?(account: string) {
    const res = await this._actor.tokens(accountHashFromString(account));
    if ("ok" in res) {
      return Array.from(res.ok)
        .map((tokenId) => BigInt(tokenId))
        .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    }
    return [];
  }

  async transfer?(
    args: {
      to: string;
      fromSubaccount?: Uint8Array;
      memo?: Uint8Array;
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
      memo: args.memo ? args.memo : Uint8Array.from([0]),
      notify: false,
      subaccount: args.fromSubaccount ? [args.fromSubaccount] : [],
      to: { address: accountHashFromString(args.to) },
      token:
        "tokenId" in args
          ? tokenIdToExtTokenId(canisterId, args.tokenId).toText()
          : "",
    });
    if ("ok" in res) {
      // EXT does not return transaction id
      return BigInt(0);
    }
    throw Error(JSON.stringify(res.err));
  }

  async icon?() {
    // TODO
    return "";
  }

  async logo?() {
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

  async assetOf?(tokenId: bigint) {
    const canisterId = Actor.canisterIdOf(this._actor);
    return {
      location: `${actorOrigin(
        this._actor,
        true
      )}/?tokenid=${tokenIdToExtTokenId(canisterId, tokenId).toText()}`,
    };
  }

  async imageOf?(tokenId: bigint) {
    const canisterId = Actor.canisterIdOf(this._actor);
    const image = `${actorOrigin(
      this._actor,
      true
    )}/?tokenid=${tokenIdToExtTokenId(
      canisterId,
      tokenId
    ).toText()}&type=thumbnail`;

    // Exceptions that return an SVG image that fetches the actual image with JS,
    // since this method intends to return images that can be actually rendered as image,
    // we'll fetch this image url and return it instead.
    switch (canisterId.toText()) {
      case "pk6rk-6aaaa-aaaae-qaazq-cai":
      case "dhiaa-ryaaa-aaaae-qabva-cai":
      case "skjpp-haaaa-aaaae-qac7q-cai":
        return fetch(image)
          .then((res) => res.text())
          .then(
            (text) => /fetch\(["'](.*\.svg)["']\)/.exec(text)?.[1] ?? undefined
          );
    }

    return image;
  }

  async attributesOf?(tokenId: bigint) {
    const canisterId = Actor.canisterIdOf(this._actor);
    const filter = await fetch(
      `${ENTREPOT_FILTERS_API}/${canisterId.toText()}.json`
    )
      .then((res) => res.json())
      .catch(() => undefined);
    if (!filter) {
      return;
    }
    return filter[1]
      .find(([tokenIndex]: [number]) => tokenIndex === Number(tokenId))?.[1]
      ?.map(([traitTypeIndex, valueIndex]: [number, number]) => {
        const trait = filter[0].find(
          ([_traitTypeIndex]: [number]) => _traitTypeIndex === traitTypeIndex
        );
        return {
          value: {
            Text:
              trait?.[2]?.find(
                ([_valueIndex]: [number]) => _valueIndex === valueIndex
              )?.[1] ?? "",
          },
          traitType: trait?.[1],
        };
      });
  }
}
