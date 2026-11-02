import { describe, expect, it } from "bun:test";

export function shouldSkipCleanupForDuration(
  minDurationSecs: number,
  audioDurationSecs: number,
): boolean {
  return minDurationSecs > 0 && audioDurationSecs < minDurationSecs;
}

describe("P1: Skip cleanup for short speech duration setting", () => {
  it("0 seconds means 'Always cleans up' — never skips", () => {
    expect(shouldSkipCleanupForDuration(0, 0.1)).toBe(false);
    expect(shouldSkipCleanupForDuration(0, 0.5)).toBe(false);
    expect(shouldSkipCleanupForDuration(0, 2.0)).toBe(false);
    expect(shouldSkipCleanupForDuration(0, 60.0)).toBe(false);
  });

  it("skips cleanup when audio duration is strictly less than threshold", () => {
    const thresholdSecs = 3;
    expect(shouldSkipCleanupForDuration(thresholdSecs, 0.2)).toBe(true);
    expect(shouldSkipCleanupForDuration(thresholdSecs, 1.8)).toBe(true);
    expect(shouldSkipCleanupForDuration(thresholdSecs, 2.99)).toBe(true);
  });

  it("does not skip cleanup when audio duration meets or exceeds threshold", () => {
    const thresholdSecs = 3;
    expect(shouldSkipCleanupForDuration(thresholdSecs, 3.0)).toBe(false);
    expect(shouldSkipCleanupForDuration(thresholdSecs, 3.05)).toBe(false);
    expect(shouldSkipCleanupForDuration(thresholdSecs, 12.4)).toBe(false);
  });

  it("handles boundary values correctly (0 to 300 seconds clamp)", () => {
    const clampMinSecs = (val: number) => Math.max(0, Math.min(300, val));
    expect(clampMinSecs(-5)).toBe(0);
    expect(clampMinSecs(0)).toBe(0);
    expect(clampMinSecs(15)).toBe(15);
    expect(clampMinSecs(350)).toBe(300);
  });
});
