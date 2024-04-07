import {
  type CommonTokenBatchMethods,
  type CommonTokenMethods,
  type CreateActor,
  createCandidDecoder,
  decodeAccount,
  type DecodeCall,
  encodeAccount,
  type ImplementedStandards,
  type MetadataValue,
  type NonFungibleTokenBatchMethods,
  type NonFungibleTokenMethods,
  type TokenConfig,
} from "@slide-computer/tokens";
import { Actor, type ActorConfig, type ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./idl";
import { type _SERVICE } from "./service";

type Methods = Pick<
  CommonTokenMethods,
  | "metadata"
  | "name"
  | "symbol"
  | "logo"
  | "totalSupply"
  | "maxMemoSize"
  | "balanceOf"
> &
  Pick<
    NonFungibleTokenMethods,
    | "supplyCap"
    | "tokenMetadata"
    | "ownerOf"
    | "tokens"
    | "tokensOf"
    | "transferToken"
  > &
  Pick<CommonTokenBatchMethods, "batchBalanceOf"> &
  Pick<
    NonFungibleTokenBatchMethods,
    "batchTokenMetadata" | "batchOwnerOf" | "batchTransferToken"
  >;

export const Icrc7 = class implements Methods {
  static implementedStandards = ["ICRC-7"] as const;

  readonly #config: TokenConfig;
  readonly #actor: ActorSubclass<_SERVICE>;

  constructor(config: TokenConfig) {
    this.#config = config;
    this.#actor = Icrc7.createActor(config);
  }

  static createActor(config: ActorConfig): ActorSubclass<_SERVICE> {
    return Actor.createActor(idlFactory, config);
  }

  static decodeCall(
    method: string,
    args: ArrayBuffer,
  ): ReturnType<DecodeCall<Methods>["decodeCall"]> {
    const { decodeArgs } = createCandidDecoder<_SERVICE>(idlFactory);
    try {
      switch (method) {
        case "icrc7_collection_metadata":
          return { method: "metadata", args: [] };
        case "icrc7_name":
          return { method: "name", args: [] };
        case "icrc7_symbol":
          return { method: "symbol", args: [] };
        case "icrc7_logo":
          return { method: "logo", args: [] };
        case "icrc7_total_supply":
          return { method: "totalSupply", args: [] };
        case "icrc7_max_memo_size":
          return { method: "maxMemoSize", args: [] };
        case "icrc7_balance_of": {
          const [accounts] = decodeArgs("icrc7_balance_of", args);
          return {
            method: "batchBalanceOf",
            args: [
              accounts.map((account) =>
                encodeAccount({
                  owner: account.owner,
                  subaccount: account.subaccount[0]?.buffer,
                }),
              ),
            ],
          };
        }
        case "icrc7_supply_cap":
          return { method: "supplyCap", args: [] };
        case "icrc7_token_metadata": {
          const [tokenIds] = decodeArgs("icrc7_token_metadata", args);
          return {
            method: "batchTokenMetadata",
            args: [tokenIds],
          };
        }
        case "icrc7_owner_of": {
          const [tokenIds] = decodeArgs("icrc7_owner_of", args);
          return {
            method: "batchOwnerOf",
            args: [tokenIds],
          };
        }
        case "icrc7_tokens": {
          const [prev, take] = decodeArgs("icrc7_tokens", args);
          return { method: "tokens", args: [prev[0], take[0]] };
        }
        case "icrc7_tokens_of": {
          const [account, prev, take] = decodeArgs("icrc7_tokens_of", args);
          return {
            method: "tokensOf",
            args: [
              encodeAccount({
                owner: account.owner,
                subaccount: account.subaccount[0]?.buffer,
              }),
              prev[0],
              take[0],
            ],
          };
        }
        case "icrc7_transfer": {
          const [batchTransferArgs] = decodeArgs("icrc7_transfer", args);
          return {
            method: "batchTransferToken",
            args: [
              batchTransferArgs.map((transferArgs) => {
                const to = encodeAccount({
                  owner: transferArgs.to.owner,
                  subaccount: transferArgs.to.subaccount[0]?.buffer,
                });
                return {
                  tokenId: transferArgs.token_id,
                  fromSubaccount: transferArgs.from_subaccount[0]?.buffer,
                  to,
                  memo: transferArgs.memo[0]?.buffer,
                  createdAtTime: transferArgs.created_at_time[0],
                };
              }),
            ],
          };
        }
      }
    } catch {}
  }

  async metadata(): Promise<Array<[string, MetadataValue]>> {
    return this.#actor.icrc7_collection_metadata.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async name(): Promise<string> {
    return this.#actor.icrc7_name.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async symbol(): Promise<string> {
    return this.#actor.icrc7_symbol.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async logo(): Promise<string | undefined> {
    const logo = await this.#actor.icrc7_logo.withOptions({
      agent: this.#config.queryAgent,
    })();
    return logo[0];
  }

  async totalSupply(): Promise<bigint> {
    return this.#actor.icrc7_total_supply.withOptions({
      agent: this.#config.queryAgent,
    })();
  }

  async maxMemoSize(): Promise<number> {
    const maxMemoSize = await this.#actor.icrc7_max_memo_size.withOptions({
      agent: this.#config.queryAgent,
    })();
    if (maxMemoSize[0] === undefined) {
      // Minimum value defined ICRC-7 standard
      return 32;
    }
    return Number(maxMemoSize[0]);
  }

  async balanceOf(account: string): Promise<bigint> {
    const [balance] = await this.batchBalanceOf([account]);
    return balance;
  }

  async supplyCap(): Promise<bigint | undefined> {
    const supplyCap = await this.#actor.icrc7_supply_cap.withOptions({
      agent: this.#config.queryAgent,
    })();
    return supplyCap[0];
  }

  async tokenMetadata(
    tokenId: bigint,
  ): Promise<Array<[string, MetadataValue]> | undefined> {
    const [metadata] = await this.batchTokenMetadata([tokenId]);
    return metadata;
  }

  async ownerOf(tokenId: bigint): Promise<string | undefined> {
    const [account] = await this.batchOwnerOf([tokenId]);
    return account;
  }

  async tokens(prev?: bigint, take?: bigint): Promise<bigint[]> {
    return this.#actor.icrc7_tokens.withOptions({
      agent: this.#config.queryAgent,
    })(prev === undefined ? [] : [prev], take === undefined ? [] : [take]);
  }

  async tokensOf(
    account: string,
    prev?: bigint,
    take?: bigint,
  ): Promise<bigint[]> {
    const of = decodeAccount(account);
    return this.#actor.icrc7_tokens_of.withOptions({
      agent: this.#config.queryAgent,
    })(
      {
        owner: of.owner,
        subaccount: of.subaccount ? [new Uint8Array(of.subaccount)] : [],
      },
      prev === undefined ? [] : [prev],
      take === undefined ? [] : [take],
    );
  }

  async transferToken(args: {
    tokenId: bigint;
    fromSubaccount?: ArrayBuffer;
    to: string;
    memo?: ArrayBuffer;
    createdAtTime?: bigint;
  }): Promise<bigint> {
    const response = await this.batchTransferToken([args])[0];
    if (response === undefined) {
      // An ICRC-7 token response should always return an error besides null, which means
      // only a tx index or error is a valid return value when the batch length is n = 1.
      throw Error(
        "ICRC-7 token does not seem to have implemented batch correctly",
      );
    }
    return response;
  }

  async batchBalanceOf(accounts: string[]): Promise<bigint[]> {
    return this.#actor.icrc7_balance_of.withOptions({
      agent: this.#config.queryAgent,
    })(
      accounts.map(decodeAccount).map((account) => ({
        owner: account.owner,
        subaccount: account.subaccount
          ? [new Uint8Array(account.subaccount)]
          : [],
      })),
    );
  }

  async batchTokenMetadata(
    tokenIds: bigint[],
  ): Promise<Array<Array<[string, MetadataValue]> | undefined>> {
    const responses = await this.#actor.icrc7_token_metadata.withOptions({
      agent: this.#config.queryAgent,
    })(tokenIds);
    return responses.map(([response]) => response);
  }

  async batchOwnerOf(tokenIds: bigint[]): Promise<Array<string | undefined>> {
    const responses = await this.#actor.icrc7_owner_of.withOptions({
      agent: this.#config.queryAgent,
    })(tokenIds);
    return responses.map(
      ([response]) =>
        response &&
        encodeAccount({
          owner: response.owner,
          subaccount: response.subaccount[0],
        }),
    );
  }

  batchTransferToken(
    args: Array<{
      tokenId: bigint;
      fromSubaccount?: ArrayBuffer;
      to: string;
      memo?: ArrayBuffer;
      createdAtTime?: bigint;
    }>,
  ): Array<Promise<bigint | undefined>> {
    const responsesPromise = this.#actor.icrc7_transfer(
      args.map((transferArgs) => {
        const to = decodeAccount(transferArgs.to);
        return {
          token_id: transferArgs.tokenId,
          from_subaccount: [],
          to: {
            owner: to.owner,
            subaccount: to.subaccount ? [new Uint8Array(to.subaccount)] : [],
          },
          memo: transferArgs.memo ? [new Uint8Array(transferArgs.memo)] : [],
          created_at_time: transferArgs.createdAtTime
            ? [transferArgs.createdAtTime]
            : [],
        };
      }),
    );
    return args.map(async (_, index) => {
      const responses = await responsesPromise;
      const response = responses[index];
      if (!response[0]) {
        return;
      }
      if ("Err" in response[0]) {
        throw response[0].Err;
      }
      return response[0].Ok;
    });
  }
} satisfies ImplementedStandards & CreateActor<_SERVICE> & DecodeCall<Methods>;
