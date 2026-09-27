import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const paymentState = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@x402/express", () => {
  class TestResourceServer {
    constructor(..._args: unknown[]) {}

    register(..._args: unknown[]) {
      return this;
    }
  }

  return {
    x402ResourceServer: TestResourceServer,
    paymentMiddleware: () => (_req: Request, res: Response, _next: NextFunction) => {
      paymentState.calls += 1;
      return res.status(402).json({ error: "payment required" });
    },
  };
});

import { createApp } from "../src/server.js";

let server: Server | undefined;

afterEach(async () => {
  paymentState.calls = 0;
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  }
});

async function startServer() {
  const app = createApp();
  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("paid route ordering", () => {
  it("rejects an unreadable notice before payment middleware", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/parse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notice: "late maybe after dinner" }),
    });

    expect(response.status).toBe(422);
    expect(paymentState.calls).toBe(0);
  });

  it("passes a readable notice to payment middleware", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/parse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notice: "Train 11010 station PUNE expected arrival 18:45" }),
    });

    expect(response.status).toBe(402);
    expect(paymentState.calls).toBe(1);
  });

  it("rejects an oversized body before payment middleware", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/parse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notice: "x".repeat(5_000) }),
    });

    expect(response.status).toBe(413);
    expect(paymentState.calls).toBe(0);
  });
});
