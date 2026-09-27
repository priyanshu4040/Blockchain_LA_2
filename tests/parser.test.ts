import { describe, expect, it } from "vitest";
import { parseDelayNotice, ParseError } from "../src/parser.js";

describe("parseDelayNotice", () => {
  it("parses a readable English notice", () => {
    expect(
      parseDelayNotice("Train 11010 station PUNE expected arrival 18:45 reason: signal failure near Daund"),
    ).toEqual({
      train: "11010",
      station: "PUNE",
      expectedTime: "18:45",
      reason: "signal failure near Daund",
    });
  });

  it("parses Hindi/Marathi reason labels", () => {
    expect(parseDelayNotice("गाडी क्रमांक 12128 स्टेशन CSMT अपेक्षित 21:05 कारण मुसळधार पाऊस")).toEqual({
      train: "12128",
      station: "CSMT",
      expectedTime: "21:05",
      reason: "मुसळधार पाऊस",
    });
  });

  it("rejects a malformed notice before any payment should be requested", () => {
    expect(() => parseDelayNotice("late maybe after dinner, platform unclear")).toThrow(ParseError);
  });
});
