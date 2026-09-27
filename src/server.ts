import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { parseDelayNotice, ParseError, type DelayNotice } from "./parser.js";
import {
  MAX_BULK_NOTICES,
  MAX_NOTICE_CHARS,
  PAID_ROUTES,
  X402_FACILITATOR_URL,
  X402_NETWORK,
} from "./config.js";

type ParsedRequest = Request & {
  parsedNotice?: DelayNotice;
  parsedNotices?: DelayNotice[];
};

type RequestBodyError = Error & {
  status?: number;
  type?: string;
};

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "4kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "meera-railway-delay-api",
      paidRoutes: Object.keys(PAID_ROUTES),
    });
  });

  app.post("/v1/try-parse", validateSingleNotice, (req: ParsedRequest, res) => {
    res.json({ data: req.parsedNotice });
  });

  app.use(["/v1/parse", "/v1/parse/bulk"], rejectUnparseableBeforePayment);

  const facilitatorClient = new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    X402_NETWORK,
    new ExactEvmScheme(),
  );

  app.use(paymentMiddleware(PAID_ROUTES, resourceServer));

  app.post("/v1/parse", (req: ParsedRequest, res) => {
    res.json({ data: req.parsedNotice });
  });

  app.post("/v1/parse/bulk", (req: ParsedRequest, res) => {
    res.json({ data: req.parsedNotices });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const bodyError = err as RequestBodyError;
    if (bodyError.status === 413 || bodyError.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body exceeds 4kb." });
    }
    if (err instanceof SyntaxError && bodyError.status === 400) {
      return res.status(400).json({ error: "Request body must be valid JSON." });
    }
    return res.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}

function rejectUnparseableBeforePayment(req: ParsedRequest, res: Response, next: NextFunction) {
  const path = new URL(req.originalUrl, "http://localhost").pathname;
  if (path === "/v1/parse") {
    return validateSingleNotice(req, res, next);
  }
  if (path === "/v1/parse/bulk") {
    return validateBulkNotices(req, res, next);
  }
  return next();
}

function validateSingleNotice(req: ParsedRequest, res: Response, next: NextFunction) {
  const notice = req.body?.notice;
  const lengthError = validateNoticeText(notice);
  if (lengthError) return res.status(lengthError.status).json({ error: lengthError.message });

  try {
    req.parsedNotice = parseDelayNotice(notice);
    return next();
  } catch (error) {
    if (error instanceof ParseError) {
      return res.status(422).json({ error: error.message });
    }
    return next(error);
  }
}

function validateBulkNotices(req: ParsedRequest, res: Response, next: NextFunction) {
  const notices = req.body?.notices;
  if (!Array.isArray(notices)) {
    return res.status(400).json({ error: "Body must include a notices array." });
  }
  if (notices.length === 0 || notices.length > MAX_BULK_NOTICES) {
    return res.status(413).json({ error: `Bulk requests must contain 1-${MAX_BULK_NOTICES} notices.` });
  }

  const parsed: DelayNotice[] = [];
  for (const [index, notice] of notices.entries()) {
    const lengthError = validateNoticeText(notice);
    if (lengthError) {
      return res.status(lengthError.status).json({ error: `Notice ${index}: ${lengthError.message}` });
    }
    try {
      parsed.push(parseDelayNotice(notice));
    } catch (error) {
      if (error instanceof ParseError) {
        return res.status(422).json({ error: `Notice ${index}: ${error.message}` });
      }
      return next(error);
    }
  }

  req.parsedNotices = parsed;
  return next();
}

function validateNoticeText(notice: unknown): { status: number; message: string } | undefined {
  if (typeof notice !== "string") {
    return { status: 400, message: "Body must include a notice string." };
  }
  if (notice.length > MAX_NOTICE_CHARS) {
    return { status: 413, message: `Notice exceeds ${MAX_NOTICE_CHARS} characters.` };
  }
  return undefined;
}

const port = Number.parseInt(process.env.PORT ?? "4020", 10);

if (process.env.NODE_ENV !== "test") {
  createApp().listen(port, () => {
    console.log(`Meera's Railway Delay API listening on http://localhost:${port}`);
  });
}
