import type { RoutesConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";

// Base Sepolia is fixed server-side so deployment input cannot select a mainnet.
export const X402_NETWORK: Network = "eip155:84532";
export const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

export const PAY_TO_ADDRESS =
  process.env.PAY_TO_ADDRESS ?? "0x0000000000000000000000000000000000000000";

export const SINGLE_PARSE_PRICE_USD = process.env.SINGLE_PARSE_PRICE_USD ?? "0.001";
export const BULK_PARSE_PRICE_USD = process.env.BULK_PARSE_PRICE_USD ?? "0.003";

export const MAX_NOTICE_CHARS = Number.parseInt(process.env.MAX_NOTICE_CHARS ?? "1200", 10);
export const MAX_BULK_NOTICES = Number.parseInt(process.env.MAX_BULK_NOTICES ?? "10", 10);

export const PAID_ROUTES = {
  "POST /v1/parse": {
    accepts: {
      scheme: "exact",
      price: `$${SINGLE_PARSE_PRICE_USD}`,
      network: X402_NETWORK,
      payTo: PAY_TO_ADDRESS,
      maxTimeoutSeconds: 60,
    },
    description: "Parse one Indian Railways delay notice into structured JSON.",
  },
  "POST /v1/parse/bulk": {
    accepts: {
      scheme: "exact",
      price: `$${BULK_PARSE_PRICE_USD}`,
      network: X402_NETWORK,
      payTo: PAY_TO_ADDRESS,
      maxTimeoutSeconds: 60,
    },
    description: "Parse a batch of Indian Railways delay notices into structured JSON.",
  },
} as const satisfies RoutesConfig;
