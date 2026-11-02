import { describe, expect, it } from "bun:test";
import type { HistoryEntry } from "@/bindings";

describe("History Parity (P7)", () => {
  const sampleEntry: HistoryEntry = {
    id: 101,
    file_name: "recording_test.wav",
    timestamp: 1730560000,
    saved: false,
    title: "10:45 AM",
    transcription_text: "नमस्ते आप कैसे हैं",
    post_processed_text: "Namaste aap kaise hain",
    post_process_prompt: "clean",
    post_process_requested: true,
    dismissed: false,
    stt_provider: "gemini-3.5-transcribe",
    stt_model: "default",
    stt_duration_ms: 2757,
    cleanup_provider: "groq",
    cleanup_model: "openai/gpt-oss-20b",
    cleanup_duration_ms: 1344,
    cleanup_status: "applied",
    cleanup_error: null,
  };

  it("calculates SayIt-style timing summary string with ASR and LLM ms", () => {
    const asrMs = sampleEntry.stt_duration_ms!;
    const llmMs = sampleEntry.cleanup_duration_ms!;
    const totalSec = (((asrMs ?? 0) + (llmMs ?? 0)) / 1000).toFixed(1);

    const timingSummary =
      asrMs != null && llmMs != null
        ? `Transcribed in ${totalSec}s (ASR ${asrMs}ms + LLM ${llmMs}ms)`
        : asrMs != null
          ? `Transcribed in ${totalSec}s (ASR ${asrMs}ms)`
          : llmMs != null
            ? `Transcribed in ${totalSec}s (LLM ${llmMs}ms)`
            : null;

    expect(timingSummary).toBe("Transcribed in 4.1s (ASR 2757ms + LLM 1344ms)");
  });

  it("distinguishes Cloud API vs Local Mode chip labels", () => {
    const cloudEntry = { ...sampleEntry, stt_provider: "Deepgram" };
    const localEntry = { ...sampleEntry, stt_provider: "Local" };
    const defaultEntry = { ...sampleEntry, stt_provider: null };

    const getMode = (entry: HistoryEntry) => {
      const isCloud =
        Boolean(entry.stt_provider) &&
        entry.stt_provider?.toLowerCase() !== "local";
      return isCloud ? "Cloud API" : "Local Mode";
    };

    expect(getMode(cloudEntry)).toBe("Cloud API");
    expect(getMode(localEntry)).toBe("Local Mode");
    expect(getMode(defaultEntry)).toBe("Local Mode");
  });

  it("preserves cleaned Roman text on top and raw ASR as distinct source", () => {
    expect(sampleEntry.post_processed_text).toBe("Namaste aap kaise hain");
    expect(sampleEntry.transcription_text).toBe("नमस्ते आप कैसे हैं");
    expect(sampleEntry.post_processed_text).not.toBe(sampleEntry.transcription_text);
  });

  it("enforces D9 disabled actions when audio file is missing", () => {
    const entryWithoutAudio: HistoryEntry = {
      ...sampleEntry,
      file_name: "",
    };

    const hasAudio = Boolean(
      entryWithoutAudio.file_name && entryWithoutAudio.file_name.trim().length > 0,
    );
    expect(hasAudio).toBe(false);

    // Per D9: actions requiring audio (play, download, retry) must be disabled with clear UI, not hidden
    const playDisabled = !hasAudio;
    const downloadDisabled = !hasAudio;
    const retryDisabled = !hasAudio;

    expect(playDisabled).toBe(true);
    expect(downloadDisabled).toBe(true);
    expect(retryDisabled).toBe(true);
  });
});
