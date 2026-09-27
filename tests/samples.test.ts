import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DelayNoticeSchema, ParseError, parseDelayNotice } from "../src/parser.js";

const samplesRoot = join(process.cwd(), "samples");

function readSamples(folder: "well-formed" | "broken") {
  const directory = join(samplesRoot, folder);
  return readdirSync(directory).map((name) => ({
    name,
    notice: readFileSync(join(directory, name), "utf8"),
  }));
}

describe("sample notices", () => {
  for (const sample of readSamples("well-formed")) {
    it(`parses ${sample.name} and returns schema-valid output`, () => {
      const parsed = parseDelayNotice(sample.notice);
      expect(DelayNoticeSchema.safeParse(parsed).success).toBe(true);
    });
  }

  for (const sample of readSamples("broken")) {
    it(`rejects ${sample.name}`, () => {
      expect(() => parseDelayNotice(sample.notice)).toThrow(ParseError);
    });
  }
});
