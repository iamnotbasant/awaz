import { describe, expect, it } from "bun:test";
import { getCachedPreference, resolveTheme } from "./theme";
import fs from "fs";
import path from "path";

describe("P8: Pure-black Theme", () => {
  it("defaults cached preference to dark", () => {
    // Clear localStorage to test default
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    expect(getCachedPreference()).toBe("dark");
  });

  it("resolves dark theme preference to dark", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("configures pure-black #000000 background and #ffffff text in App.css", () => {
    const appCssPath = path.resolve(__dirname, "../App.css");
    const appCss = fs.readFileSync(appCssPath, "utf-8");

    // Check dark theme block exists
    expect(appCss).toContain(':root[data-theme="dark"]');

    // Canvas/background must be pure black #000000
    expect(appCss).toContain("--color-canvas: #000000;");
    expect(appCss).toContain("--color-canvas-soft: #000000;");
    expect(appCss).toContain("--color-background: #000000;");
    expect(appCss).toContain("background-color: #000000;");

    // Primary text must be pure white #ffffff
    expect(appCss).toContain("--color-ink: #ffffff;");
    expect(appCss).toContain("--color-text: #ffffff;");

    // Cards and surfaces must be pitch-dark / pure-black ramp
    expect(appCss).toContain("--color-surface: #0a0a0a;");
    expect(appCss).toContain("--color-hairline: #27272a;");
  });

  it("ensures recording overlay uses pure black #000000", () => {
    const overlayCssPath = path.resolve(
      __dirname,
      "../overlay/RecordingOverlay.css",
    );
    const overlayCss = fs.readFileSync(overlayCssPath, "utf-8");
    expect(overlayCss).toContain("#000000");
  });

  it("ensures assistant panel uses pure black #000000 surface", () => {
    const assistantCssPath = path.resolve(
      __dirname,
      "../assistant/AssistantPanel.css",
    );
    const assistantCss = fs.readFileSync(assistantCssPath, "utf-8");
    expect(assistantCss).toContain(
      "--as-surface: rgba(0, 0, 0, var(--as-alpha, 1));",
    );
    expect(assistantCss).toContain("--as-ink: #ffffff;");
  });
});
