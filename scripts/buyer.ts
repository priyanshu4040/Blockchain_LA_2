import "dotenv/config";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";
import { X402_NETWORK } from "../src/config.js";

const privateKey = process.env.BUYER_PRIVATE_KEY;
const apiUrl = process.env.API_URL ?? "http://localhost:4020";

if (!privateKey || privateKey.includes("replace_with")) {
  throw new Error("Set BUYER_PRIVATE_KEY in .env to a funded Base Sepolia test wallet private key.");
}

const account = privateKeyToAccount(privateKey as `0x${string}`);
const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network: X402_NETWORK,
      client: new ExactEvmScheme(account),
    },
  ],
});

const response = await fetchWithPayment(`${apiUrl}/v1/parse`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    notice: "Train 11010 station PUNE expected arrival 18:45 reason: signal failure near Daund",
  }),
});

const body = await response.json();
console.log(JSON.stringify({ status: response.status, body }, null, 2));
