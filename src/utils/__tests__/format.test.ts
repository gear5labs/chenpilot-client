import { describe, it, expect } from "vitest";
import {
  formatAddress,
  formatTokenAmount,
  formatLargeNumber,
  formatFileSize,
  capitalize,
  toTitleCase,
  truncateText,
} from "../format";

// #141 — table-driven tests for format utils.
// All tests assume fixed TZ/UTC and en-US locale via vitest config.

describe("formatAddress", () => {
  const cases: Array<[string, number, number, string, string]> = [
    // [input, startChars, endChars, expected, name]
    ["GABCDEF12345678901234567890123456789012345678901234567890", 6, 4, "GABCDE...7890", "typical address"],
    ["GABC", 6, 4, "GABC", "short address unchanged"],
    ["", 6, 4, "", "empty string passes through"],
    ["GABCDEF12", 6, 4, "GABCDEF12", "address length exactly startChars+endChars-1 unchanged"],
    ["GABCDE1234", 6, 4, "GABCDE1234", "address length exactly startChars+endChars unchanged"],
    ["GABCDEF12345", 6, 4, "GABCDE...2345", "address length startChars+endChars+1 truncated"],
  ];
  for (const [input, start, end, expected, name] of cases) {
    it(`${name} (${input.length} chars)`, () => {
      expect(formatAddress(input, start, end)).toBe(expected);
    });
  }

  it("uses defaults startChars=6, endChars=4 when omitted", () => {
    const addr = "GABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789AB";
    expect(formatAddress(addr)).toBe("GABCDE...89AB");
  });
});

describe("formatTokenAmount", () => {
  const cases: Array<[string | number, number, string | undefined, string, string]> = [
    ["123.456789", 4, undefined, "123.4568", "string amount trimmed to 4 decimals"],
    [123.456789, 2, undefined, "123.46", "number amount trimmed to 2 decimals"],
    ["0.0001", 4, undefined, "0.0001", "small amount preserved"],
    [0, 4, undefined, "0", "zero"],
    ["not a number", 4, undefined, "0", "NaN string returns 0"],
    ["1000", 0, "XLM", "1000 XLM", "with token symbol"],
    [1.5, 2, "USDC", "1.5 USDC", "with token symbol and trimming"],
  ];
  for (const [amount, decimals, sym, expected, name] of cases) {
    it(`${name}`, () => {
      expect(formatTokenAmount(amount, decimals, sym)).toBe(expected);
    });
  }
});

describe("formatLargeNumber", () => {
  const cases: Array<[number, number, string, string]> = [
    [999, 1, "999", "hundreds — no suffix"],
    [1000, 1, "1.0K", "thousand boundary"],
    [1500, 2, "1.50K", "thousand with 2 decimals"],
    [1_000_000, 1, "1.0M", "million boundary"],
    [2_500_000, 2, "2.50M", "million with 2 decimals"],
    [1_000_000_000, 1, "1.0B", "billion boundary"],
    [0, 1, "0", "zero"],
    [-5, 1, "-5", "negative (no suffix)"],
  ];
  for (const [num, decimals, expected, name] of cases) {
    it(`${name} (n=${num}, decimals=${decimals})`, () => {
      expect(formatLargeNumber(num, decimals)).toBe(expected);
    });
  }
});

describe("formatFileSize", () => {
  const cases: Array<[number, number, string, string]> = [
    [0, 2, "0 Bytes", "zero bytes"],
    [500, 2, "500 Bytes", "sub-KB"],
    [1024, 2, "1 KB", "exactly 1 KB"],
    [1536, 2, "1.5 KB", "1.5 KB"],
    [1_048_576, 2, "1 MB", "exactly 1 MB"],
    [1_572_864, 1, "1.5 MB", "1.5 MB"],
    [1_073_741_824, 2, "1 GB", "exactly 1 GB"],
  ];
  for (const [bytes, decimals, expected, name] of cases) {
    it(`${name} (${bytes} bytes, decimals=${decimals})`, () => {
      expect(formatFileSize(bytes, decimals)).toBe(expected);
    });
  }
});

describe("capitalize", () => {
  const cases: Array<[string, string, string]> = [
    ["hello", "Hello", "lowercase first letter"],
    ["HELLO", "Hello", "uppercase rest lowered"],
    ["hELLO", "Hello", "mixed case"],
    ["", "", "empty string"],
    ["a", "A", "single char"],
    ["ABC DEF", "Abc def", "with space"],
  ];
  for (const [input, expected, name] of cases) {
    it(`${name}: "${input}"`, () => {
      expect(capitalize(input)).toBe(expected);
    });
  }
});

describe("toTitleCase", () => {
  const cases: Array<[string, string, string]> = [
    ["hello world", "Hello World", "two words"],
    ["HELLO WORLD", "Hello World", "uppercase to title"],
    ["", "", "empty"],
    ["a", "A", "single char"],
    ["the quick brown fox", "The Quick Brown Fox", "long sentence"],
  ];
  for (const [input, expected, name] of cases) {
    it(`${name}: "${input}"`, () => {
      expect(toTitleCase(input)).toBe(expected);
    });
  }
});

describe("truncateText", () => {
  const cases: Array<[string, number, string | undefined, string, string]> = [
    ["hello", 10, undefined, "hello", "no truncation needed"],
    ["hello world", 8, undefined, "hello...", "default suffix"],
    ["hello world", 8, ">", "hello w>", "custom suffix"],
    ["hello world", 11, "...", "hello world", "exact length no truncation"],
    ["", 5, "...", "", "empty input"],
  ];
  for (const [input, max, suffix, expected, name] of cases) {
    it(`${name}: max=${max}`, () => {
      expect(truncateText(input, max, suffix)).toBe(expected);
    });
  }
});
