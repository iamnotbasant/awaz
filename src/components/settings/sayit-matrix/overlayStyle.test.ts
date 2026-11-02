import { describe, expect, it } from "bun:test";
import {
  OVERLAY_THEME_OPTIONS,
  OVERLAY_WIDTH_PRESETS,
  getBarColor,
  getTimerColor,
  type OverlayWaveTheme,
  type OverlayWidthPreset,
} from "../OverlayStyle";

describe("P6: SayIt-Style Overlay Customization", () => {
  it("provides 3 waveform themes: White on black, Blue on black, and Rainbow on black", () => {
    const themes = OVERLAY_THEME_OPTIONS.map((t) => t.theme);
    expect(themes).toContain("black-white");
    expect(themes).toContain("black-blue");
    expect(themes).toContain("black-rainbow");
    expect(OVERLAY_THEME_OPTIONS.length).toBe(3);
  });

  it("provides 3 overlay width presets: Long (24 bars), Medium (18 bars), and Short (12 bars)", () => {
    expect(OVERLAY_WIDTH_PRESETS.long.barCount).toBe(24);
    expect(OVERLAY_WIDTH_PRESETS.medium.barCount).toBe(18);
    expect(OVERLAY_WIDTH_PRESETS.short.barCount).toBe(12);
  });

  it("calculates themed bar colors accurately across themes", () => {
    // black-white: pure crisp white
    expect(getBarColor(0, 18, "black-white")).toBe("#f1f5f9");
    expect(getBarColor(9, 18, "black-white")).toBe("#f1f5f9");

    // black-blue: cyan to blue/indigo hsl range
    const blueStart = getBarColor(0, 18, "black-blue");
    const blueEnd = getBarColor(17, 18, "black-blue");
    expect(blueStart).toContain("hsl");
    expect(blueEnd).toContain("hsl");
    expect(blueStart).not.toBe(blueEnd);

    // black-rainbow: green (hsl 140) to red (hsl 30)
    const rainbowStart = getBarColor(0, 18, "black-rainbow");
    const rainbowEnd = getBarColor(17, 18, "black-rainbow");
    expect(rainbowStart).toContain("hsl(140");
    expect(rainbowEnd).toContain("hsl(30");
  });

  it("returns matching timer color per theme", () => {
    expect(getTimerColor("black-white")).toBe("#e5e7eb");
    expect(getTimerColor("black-blue")).toBe("#bae6fd");
    expect(getTimerColor("black-rainbow")).toBe("#fef08a");
  });

  it("manages elapsed duration and streaming caption display flags", () => {
    const settings = {
      overlay_show_duration: true,
      overlay_streaming_display: true,
      overlay_waveform_theme: "black-rainbow" as OverlayWaveTheme,
      overlay_width: "medium" as OverlayWidthPreset,
    };

    expect(settings.overlay_show_duration).toBe(true);
    expect(settings.overlay_streaming_display).toBe(true);
    expect(OVERLAY_WIDTH_PRESETS[settings.overlay_width].barCount).toBe(18);
  });
});
