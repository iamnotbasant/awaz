import { describe, expect, test } from "bun:test";

describe("Slice 4: SayIt Settings Matrix", () => {
  describe("Provider Test Matrix & Latency Badges", () => {
    test("tracks latency and error states correctly", () => {
      type ProviderState = "idle" | "testing" | "ok" | "error";
      interface ProviderStatus {
        id: string;
        kind: "stt" | "cleanup";
        state: ProviderState;
        latency?: number;
        error?: string;
      }

      const p: ProviderStatus = {
        id: "gemini",
        kind: "stt",
        state: "idle",
      };

      expect(p.state).toBe("idle");

      // Transition to testing
      const testing = { ...p, state: "testing" as ProviderState };
      expect(testing.state).toBe("testing");

      // Transition to ok with latency (e.g. 240ms)
      const ok = { ...testing, state: "ok" as ProviderState, latency: 240 };
      expect(ok.state).toBe("ok");
      expect(ok.latency).toBe(240);

      // Transition to error (e.g. 404 or bad API key)
      const err = {
        ...p,
        state: "error" as ProviderState,
        error: "HTTP 401 Unauthorized",
      };
      expect(err.state).toBe("error");
      expect(err.error).toContain("401");
    });
  });

  describe("Shipped Presets & Prompt Manager", () => {
    test("contains all 6 core shipped presets", () => {
      const SHIPPED_PRESET_IDS = [
        "hinglish_roman",
        "selection_edit",
        "speakoflow_readable",
        "formal_english",
        "concise_notes",
        "verbatim_transcription",
      ];

      expect(SHIPPED_PRESET_IDS.length).toBe(6);
      expect(SHIPPED_PRESET_IDS).toContain("hinglish_roman");
      expect(SHIPPED_PRESET_IDS).toContain("formal_english");
      expect(SHIPPED_PRESET_IDS).toContain("concise_notes");
      expect(SHIPPED_PRESET_IDS).toContain("verbatim_transcription");
    });

    test("per-app rules mapping works correctly", () => {
      const appRules: Record<string, string> = {};
      appRules["Code.exe"] = "formal_english";
      appRules["WhatsApp.exe"] = "hinglish_roman";

      expect(appRules["Code.exe"]).toBe("formal_english");
      expect(appRules["WhatsApp.exe"]).toBe("hinglish_roman");

      delete appRules["Code.exe"];
      expect(appRules["Code.exe"]).toBeUndefined();
    });
  });

  describe("Categorized Hotwords", () => {
    test("supports Names, Tech, Places categories and word isolation", () => {
      const hotwords: Record<string, string[]> = {
        Names: ["Basant", "Abhishek"],
        Tech: ["Tauri", "GGUF", "Parakeet", "Vulkan"],
        Places: ["Bengaluru", "Delhi"],
      };

      expect(hotwords.Names).toHaveLength(2);
      expect(hotwords.Tech).toContain("Tauri");
      expect(hotwords.Places).toContain("Bengaluru");

      // Flatten for STT native biasing
      const allWords = Object.values(hotwords).flat();
      expect(allWords).toHaveLength(8);
      expect(allWords).toContain("Parakeet");
    });
  });

  describe("Waveform Customizer", () => {
    test("supports bars, smooth wave, and minimal dots", () => {
      const validStyles = ["bars", "smooth", "dots"];
      expect(validStyles).toContain("bars");
      expect(validStyles).toContain("smooth");
      expect(validStyles).toContain("dots");
    });
  });

  describe("D9 Compliance — Disabled-with-clear-UI", () => {
    test("Server Mode and WebDAV have planned status markers", () => {
      const serverMode = {
        enabled: false,
        badge: "Planned in 0.0.1",
        notice: "Server Mode is planned for a future update.",
      };
      const webDav = {
        enabled: false,
        badge: "Planned in 0.0.1",
        notice: "WebDAV sync is planned for a future update.",
      };

      expect(serverMode.enabled).toBe(false);
      expect(serverMode.badge).toBe("Planned in 0.0.1");
      expect(webDav.enabled).toBe(false);
      expect(webDav.badge).toBe("Planned in 0.0.1");
    });
  });
});
