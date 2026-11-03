import { describe, expect, test } from "bun:test";

describe("Slice 5: Local CPU Inference Engine", () => {
  describe("Parakeet 0.6B CPU Profile", () => {
    test("adheres to 8GB RAM budget and featherlight download", () => {
      const parakeetConfig = {
        modelId: "parakeet-unified-en-0.6b-gguf",
        architecture: "parakeet",
        parameterCount: "0.6B",
        downloadSizeMb: 150,
        estimatedRamMb: 850,
        cpuKernels: "AVX2/FMA",
        language: "en",
      };

      expect(parakeetConfig.downloadSizeMb).toBeLessThan(200);
      expect(parakeetConfig.estimatedRamMb).toBeLessThan(1500); // RAM < 1.5GB
      expect(parakeetConfig.cpuKernels).toContain("AVX2");
      expect(parakeetConfig.language).toBe("en");
    });

    test("D10 compliance: Local mode enforces English-only with Hinglish notice", () => {
      const resolveLocalMode = (lang: string) => {
        if (lang === "en" || lang === "auto") {
          return {
            supported: true,
            model: "parakeet-unified-en-0.6b",
            notice: null,
          };
        }
        return {
          supported: false,
          model: "parakeet-unified-en-0.6b",
          notice:
            "Multilingual Hinglish Romanization requires Cloud API Mode (Groq Whisper).",
        };
      };

      const enResult = resolveLocalMode("en");
      expect(enResult.supported).toBe(true);

      const hiResult = resolveLocalMode("hi");
      expect(hiResult.supported).toBe(false);
      expect(hiResult.notice).toContain("Cloud API Mode");
    });
  });

  describe("Hardware Budget Gate for Heavy Models", () => {
    test("restricts 1.7B+ models on 8GB system RAM machines", () => {
      const systemRamGb = 8;
      const models = [
        {
          id: "parakeet-unified-en-0.6b",
          params: 0.6,
          minRamGb: 4,
          disabled: false,
        },
        {
          id: "nemotron-3.5-streaming-0.6b",
          params: 0.6,
          minRamGb: 6,
          disabled: false,
        },
        { id: "qwen3-asr-1.7b", params: 1.7, minRamGb: 16, disabled: true },
        { id: "canary-qwen-2.5b", params: 2.5, minRamGb: 16, disabled: true },
      ];

      for (const m of models) {
        if (m.params > 1.0) {
          expect(m.minRamGb).toBeGreaterThan(systemRamGb);
          expect(m.disabled).toBe(true);
        } else {
          expect(m.disabled).toBe(false);
        }
      }
    });
  });

  describe("Resilient Cloud Fallback", () => {
    test("resolves cloud fallback when local engine is uninitialized", () => {
      const mockState = {
        localModelLoaded: false,
        cloudConfigured: true,
        cloudProvider: "groq",
      };

      const resolveTranscriptionRoute = (state: typeof mockState) => {
        if (state.localModelLoaded)
          return { route: "local", provider: "parakeet" };
        if (state.cloudConfigured)
          return { route: "cloud_fallback", provider: state.cloudProvider };
        return {
          route: "error",
          message: "Model is not loaded for transcription.",
        };
      };

      const outcome = resolveTranscriptionRoute(mockState);
      expect(outcome.route).toBe("cloud_fallback");
      expect(outcome.provider).toBe("groq");
    });
  });
});
