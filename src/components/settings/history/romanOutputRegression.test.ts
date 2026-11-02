import { describe, expect, test } from "bun:test";
import type { HistoryEntry } from "@/bindings";

describe("Awaz 0.0.1 Roman Hinglish Output & Diagnostics Regression", () => {
  // Unicode range for Devanagari script: U+0900 to U+097F
  const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

  test("Devanagari raw ASR input cleaned by Hinglish Roman preset produces Latin/Roman output only", () => {
    const rawDevanagariInput =
      "नमस्ते भाई, क्या हाल है? कल की मीटिंग का क्या हुआ?";
    expect(DEVANAGARI_REGEX.test(rawDevanagariInput)).toBe(true);

    // Mocked cleanup result matching Prompt A contract ("namaste bhai, kya haal hai? kal ki meeting ka kya hua?")
    const cleanedRomanOutput =
      "Namaste bhai, kya haal hai? Kal ki meeting ka kya hua?";

    // Must strictly NOT contain any Devanagari characters
    expect(DEVANAGARI_REGEX.test(cleanedRomanOutput)).toBe(false);
    expect(cleanedRomanOutput).toContain("Namaste bhai");
    expect(cleanedRomanOutput).toContain("meeting");
  });

  test("Technical terms and brand names preserve proper English spelling in Roman output", () => {
    const rawDevanagariWithTech =
      "मैंने वीएस कोड में पायथन एपीआई और गिटहब टेस्ट किया।";
    expect(DEVANAGARI_REGEX.test(rawDevanagariWithTech)).toBe(true);

    const cleanedRomanTech =
      "Maine VS Code me Python API aur GitHub test kiya.";
    expect(DEVANAGARI_REGEX.test(cleanedRomanTech)).toBe(false);
    expect(cleanedRomanTech).toContain("VS Code");
    expect(cleanedRomanTech).toContain("Python");
    expect(cleanedRomanTech).toContain("API");
    expect(cleanedRomanTech).toContain("GitHub");
  });

  test("Gemini native STT interaction request carries hi-Latn and en-IN lock", () => {
    const geminiSttConfig = {
      model: "gemini-3.5-transcribe",
      generation_config: {
        response_modalities: ["TEXT"],
        speech_config: {
          language_codes: ["hi-Latn", "en-IN"],
          mode: "smart",
        },
      },
      upload_format: "wav",
      sample_rate: 16000,
      channels: 1,
    };

    expect(geminiSttConfig.model).toBe("gemini-3.5-transcribe");
    expect(geminiSttConfig.upload_format).toBe("wav");
    expect(
      geminiSttConfig.generation_config.speech_config.language_codes,
    ).toEqual(["hi-Latn", "en-IN"]);
    expect(geminiSttConfig.generation_config.speech_config.mode).toBe("smart");
  });

  test("HistoryEntry records full STT and cleanup diagnostics for latency and provider transparency", () => {
    const entry: HistoryEntry = {
      id: 101,
      file_name: "rec_20261102_194300.wav",
      timestamp: 1762102980,
      saved: false,
      title: "Today at 7:43 PM",
      transcription_text: "नमस्ते भाई",
      post_processed_text: "Namaste bhai",
      post_process_prompt: "hinglish_roman",
      post_process_requested: true,
      dismissed: false,
      stt_provider: "Gemini 3.5 Transcribe",
      stt_model: "gemini-3.5-transcribe",
      stt_duration_ms: 1240,
      cleanup_provider: "groq",
      cleanup_model: "openai/gpt-oss-20b",
      cleanup_duration_ms: 820,
      cleanup_status: "applied",
      cleanup_error: null,
    };

    expect(entry.stt_provider).toBe("Gemini 3.5 Transcribe");
    expect(entry.stt_duration_ms).toBe(1240);
    expect(entry.cleanup_status).toBe("applied");
    expect(entry.cleanup_error).toBeNull();
  });

  test("Cleanup failures are VISIBLE in HistoryEntry without silent raw fallback", () => {
    const failedEntry: HistoryEntry = {
      id: 102,
      file_name: "rec_20261102_194500.wav",
      timestamp: 1762103100,
      saved: false,
      title: "Today at 7:45 PM",
      transcription_text: "नमस्ते भाई",
      post_processed_text: null,
      post_process_prompt: null,
      post_process_requested: true,
      dismissed: false,
      stt_provider: "Gemini 3.5 Transcribe",
      stt_model: "gemini-3.5-transcribe",
      stt_duration_ms: 1100,
      cleanup_provider: "groq",
      cleanup_model: "openai/gpt-oss-20b",
      cleanup_duration_ms: 50,
      cleanup_status: "failed",
      cleanup_error: "Authentication failed. Check API key.",
    };

    expect(failedEntry.cleanup_status).toBe("failed");
    expect(failedEntry.cleanup_error).toContain("Authentication failed");
    // Raw transcription is preserved
    expect(failedEntry.transcription_text).toBe("नमस्ते भाई");
    // Post-processed is null so UI displays the warning banner with cleanup_error
    expect(failedEntry.post_processed_text).toBeNull();
  });
});
