# Meera's Railway Delay API

An x402 pay-per-call Express API for parsing messy Indian Railways delay notices into clean JSON. Valid paid requests are charged in test USDC on Base Sepolia. Garbage notices are rejected before payment middleware runs, so the buyer keeps their coin.

## Routes

- `GET /health` is free.
- `POST /v1/try-parse` is free and useful for checking a notice locally.
- `POST /v1/parse` is paid at `SINGLE_PARSE_PRICE_USD`.
- `POST /v1/parse/bulk` is paid at `BULK_PARSE_PRICE_USD`.

The paid route prices are server-side config in `src/config.ts` and `.env`; request input cannot change price or recipient. Payment is configured for `eip155:84532` / Base Sepolia through the x402 facilitator.

## Payment lifecycle

For paid routes, the API deliberately orders work like this:

1. Express enforces the JSON body limit.
2. The notice is parsed and its output is validated with `DelayNoticeSchema`.
3. Invalid input returns `400`, `413`, or `422` before x402 runs.
4. Valid input reaches x402, which verifies the payment and allows the handler to return the cached parsed result.
5. The x402 middleware settles the verified payment through the testnet facilitator.

The route handler does no parsing after payment verification. This keeps parser failures on the free side of the payment boundary.

## Project structure

```text
src/config.ts          Server-owned prices, recipient, testnet, and paid routes
src/parser.ts          Parser, output schema, and parse errors
src/server.ts          HTTP validation, x402 boundary, and route handlers
scripts/buyer.ts       Paying x402 client
samples/               Readable and deliberately broken notices
tests/                 Parser, fixture, and payment-boundary tests
```

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
PAY_TO_ADDRESS=0xYourBaseSepoliaRecipientAddress
BUYER_PRIVATE_KEY=0xYourFundedBaseSepoliaTestWalletPrivateKey
```

Do not commit `.env`. It is ignored by git.

## Run

```bash
npm run build
npm start
```

Try the free parser:

```bash
curl -s http://localhost:4020/v1/try-parse \
  -H "content-type: application/json" \
  -d '{"notice":"Train 11010 station PUNE expected arrival 18:45 reason: signal failure near Daund"}'
```

Call a paid route with the buyer script:

```bash
npm run buyer
```

Malformed notices fail before payment:

```bash
curl -i http://localhost:4020/v1/parse \
  -H "content-type: application/json" \
  -d '{"notice":"running late maybe after dinner, platform unclear"}'
```

Expected result: `422 Unprocessable Entity`, with no x402 payment challenge or settlement.

Valid unpaid paid-route calls return an x402 `402 Payment Required` response. The buyer script uses `@x402/fetch` to receive that challenge, pay with a Base Sepolia wallet, retry, and print the parsed JSON.

## Samples

Sample notices live in `samples/well-formed` and `samples/broken`.

## Tests

```bash
npm test
npm run typecheck
```

The tests execute every sample fixture and assert at HTTP level that an unreadable paid request never reaches payment middleware.
