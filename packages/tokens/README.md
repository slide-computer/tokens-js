# @slide-computer/tokens

JavaScript and TypeScript library to interact with tokens on the Internet Computer.

---

## Installation

Using Tokens:

```
npm i --save @slide-computer/tokens
```

Install additional packages to add support for specific token standards:

[@slide-computer/tokens-icrc1](https://www.npmjs.com/package/@slide-computer/tokens-icrc1)  
[@slide-computer/tokens-icrc2](https://www.npmjs.com/package/@slide-computer/tokens-icrc2)  
[@slide-computer/tokens-icrc4](https://www.npmjs.com/package/@slide-computer/tokens-icrc4)  
[@slide-computer/tokens-icrc7](https://www.npmjs.com/package/@slide-computer/tokens-icrc7)  
[@slide-computer/tokens-icrc10](https://www.npmjs.com/package/@slide-computer/tokens-icrc7)  
[@slide-computer/tokens-dip20](https://www.npmjs.com/package/@slide-computer/tokens-dip20)  
[@slide-computer/tokens-ext](https://www.npmjs.com/package/@slide-computer/tokens-ext)  
[@slide-computer/tokens-dip721-v1](https://www.npmjs.com/package/@slide-computer/tokens-dip721-v1)  
[@slide-computer/tokens-dip721-v2](https://www.npmjs.com/package/@slide-computer/tokens-dip721-v2)  
[@slide-computer/tokens-dip721-v2-approval](https://www.npmjs.com/package/@slide-computer/tokens-dip721-v2-approval)

## In the browser:

```
import { createToken } from "@slide-computer/tokens";
import { Icrc1 } from "@slide-computer/tokens-icrc1";
import { Icrc2 } from "@slide-computer/tokens-icrc2";
import { Icrc4 } from "@slide-computer/tokens-icrc4";
import { Icrc7 } from "@slide-computer/tokens-icrc7";
import { Icrc10 } from "@slide-computer/tokens-icrc10";
```

To get started with a token, run

```js
// ICRC-10 is listed first, because it should be the primary way of identifying
// supported standards before falling back to e.g. the ICRC-1 supported standards.
const token = await createToken([Icrc10, Icrc1, Icrc2, Icrc4, Icrc7], {
  canisterId: TOKEN_CANISTER_ID,
  // Required, must not be anonymous if tokens needs to be e.g. transferred
  agent: AGENT_INSTANCE,
  // Optional, recommended to use an anonymous agent for queries e.g. checking balance
  queryAgent: new HttpAgent(),
});
```

Check if a method is supported by the token before using it

```js
if (token.decimals) {
  const decimals = await token.decimals();
}
```

For example check if a token is non-fungible or fungible by checking for support of `ownerOf`

```js
const tokenIsNonFungible = !!token.ownerOf;
```

Multiple account string formats are supported (ICRC-1 is recommended)

```js
// Create ICRC-1 format account string, if a token does not support this account format
// it will convert it internally into e.g. account hash or principal (default subaccount)
const account = encodeAccount({
  owner: ACCOUNT_PRINCIPAL,
  subaccount: SUBACCOUNT_BYTES // Optional, uses default subaccount if not set
});
const balance = await token.balanceOf(account);

// Create string from principal and get it's balance
const principal = ACCOUNT_PRINCIPAL.toText();
const balanceFromPrincipal = await token.balanceOf(principal);

// Create ICP ledger account hash and get balance
const accountHash = hashAccount({
  owner: ACCOUNT_PRINCIPAL,
  subaccount: SUBACCOUNT_BYTES // Optional, uses default subaccount if not set
});
// Check if account hash is supported to avoid an unsupported exception
if (token.usesAccountHash) {
  const balanceFromAccountHash = await token.balanceOf(accountHash);
}
```

Check balance of account from user input

```js
const account = USER_INPUT;
if (!isAccount(account) || !isAccountHash(account)) {
  // Show user that account input is invalid
}
if (isAccountHash(account) && !token.usesAccountHash) {
  // Show user that this account format is not supported by token
}
const balance = await token.balanceOf(account);
```

Get NFT details: name, description, url, image and attributes

```js
// Get NFT metadata
const metadata = await token.tokenMetadata(TOKEN_ID);

// Lookup details within metadata
const name = token.tokenMetadataToName?.(metadata);
const description = token.tokenMetadataToDescription?.(metadata);
const url = token.tokenMetadataToUrl?.(metadata);
const image = token.tokenMetadataToImage?.(metadata);
const attributes = token.tokenMetadataToAttributes?.(metadata);
```

Identify the token method and arguments behind a raw canister call

```js
const decoded = token.decodeCall?.(method, args);
if (decoded.method === 'transfer') {
  // Show interface that dapp want to transfer `decoded.args[0].amount` fungible tokens
} else if (decoded.method === 'transferToken') {
  // Show interface that dapp want to transfer non-fungible token id `decoded.args[0].tokenId`
} else {
  // Show ICRC-21 consent message
}
```

Create token instance synchronously

```js
// Get standards of asynchronously created instance and store these
const standards = token.implementedStandards;

// Create instance synchronously by passing in these stored standards
const token2 = createToken([Icrc10, Icrc1, Icrc2, Icrc4, Icrc7], {
  canisterId: TOKEN_CANISTER_ID,
  agent: AGENT_INSTANCE,
  queryAgent: new HttpAgent(),
  supportedStandards: standards
});
```

## List of all available methods

See methods defined on the following exported types

### Utility method types

- [`ImplementedStandards`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/implemented-standards.ts)
- [`SupportedStandards `](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/supported-standards.ts)
- [`DecodeCall`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/decode-call.ts)
- [`TokenMetadataMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/token-metadata.ts)

### Token method types

- [`CommonTokenMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/common-methods.ts)
- [`FungibleTokenMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/fungible-methods.ts)
- [`NonFungibleTokenMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/non-fungible-methods.ts)

### Token batch method types

- [`CommonTokenBatchMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/common-batch-methods.ts)
- [`FungibleTokenBatchMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/fungible-batch-methods.ts)
- [`NonFungibleTokenBatchMethods`](https://github.com/slide-computer/tokens-js/blob/main/packages/tokens/src/types/non-fungible-batch-methods.ts)

