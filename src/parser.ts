import { z } from "zod";

export const DelayNoticeSchema = z.object({
  train: z.string().regex(/^\d{5}$/),
  station: z.string().regex(/^[A-Z]{2,5}$/),
  expectedTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().min(1).max(240).optional(),
});

export type DelayNotice = z.infer<typeof DelayNoticeSchema>;

const TRAIN_PATTERNS = [
  /(?:गाडी|रेल)\s*(?:क्रमांक|संख्या)?\s*[:#-]?\s*(\d{5})/i,
  /\b(?:train|trn|गाडी|रेल)\s*(?:no\.?|number|क्रमांक|संख्या)?\s*[:#-]?\s*(\d{5})\b/i,
  /\b(\d{5})\b/,
];

const STATION_PATTERNS = [
  /(?:स्टेशन|स्थानक)\s*(?:code)?\s*[:#-]?\s*([A-Z]{2,5})/i,
  /\b(?:station|stn|स्टेशन|स्थानक)\s*(?:code)?\s*[:#-]?\s*([A-Z]{2,5})\b/i,
  /\b(?:at|@)\s*([A-Z]{2,5})\b/i,
];

const TIME_PATTERNS = [
  /(?:अपेक्षित|नया\s*समय)\s*(?:arrival|arr|time)?\s*[:#-]?\s*(\d{1,2})[:.](\d{2})/i,
  /\b(?:expected|exp|eta|new\s*time|revised|अपेक्षित|नया\s*समय)\s*(?:arrival|arr|time)?\s*[:#-]?\s*(\d{1,2})[:.](\d{2})\b/i,
  /\b(?:arrives?|arrival|due)\s*(?:at)?\s*[:#-]?\s*(\d{1,2})[:.](\d{2})\b/i,
];

const REASON_PATTERNS = [
  /(?:कारण|वजह)\s*[:#-]?\s*([^\n;]+)/i,
  /\b(?:reason|cause|because|due\s*to|कारण|वजह)\s*[:#-]?\s*([^\n;]+)/i,
  /(?:लेट|विलंब|delay)\s*(?:because|due\s*to|कारण|वजह)?\s*[:#-]?\s*([^\n;]+)/i,
];

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseDelayNotice(rawNotice: string): DelayNotice {
  const text = rawNotice.trim().replace(/\s+/g, " ");
  if (!text) {
    throw new ParseError("Notice is empty.");
  }

  const train = firstMatch(text, TRAIN_PATTERNS);
  const station = firstMatch(text, STATION_PATTERNS)?.toUpperCase();
  const timeParts = firstTimeMatch(text);
  const reason = cleanReason(firstMatch(text, REASON_PATTERNS));

  if (!train || !station || !timeParts) {
    throw new ParseError("Notice must include train number, station code, and expected time.");
  }

  const parsed = {
    train,
    station,
    expectedTime: normalizeTime(timeParts[0], timeParts[1]),
    ...(reason ? { reason } : {}),
  };

  const validated = DelayNoticeSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ParseError("Parsed notice failed schema validation.");
  }

  return validated.data;
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function firstTimeMatch(text: string): [string, string] | undefined {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1] && match?.[2]) return [match[1], match[2]];
  }
  return undefined;
}

function normalizeTime(hourText: string, minuteText: string): string {
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new ParseError("Expected time is outside 24-hour clock range.");
  }
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function cleanReason(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  const cleaned = reason.replace(/[.。]+$/, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}
