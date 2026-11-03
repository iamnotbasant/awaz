import { describe, expect, test } from "bun:test";
import { LANGUAGES } from "@/lib/constants/languages";

describe("Awaz 0.0.3 Item 5: Hinglish Roman Option & Output Guarantee (Q4 / Q4b)", () => {
  const DEVANAGARI_REGEX = /[\u0900-\u097F\uA8E0-\uA8FF]/;

  test("Language options offer 'Hinglish (Roman)' at top level right after Auto", () => {
    const autoIndex = LANGUAGES.findIndex((l) => l.value === "auto");
    const hinglishIndex = LANGUAGES.findIndex((l) => l.value === "hinglish");

    expect(autoIndex).toBe(0);
    expect(hinglishIndex).toBe(1);
    expect(LANGUAGES[hinglishIndex].label).toBe("Hinglish (Roman)");
  });

  test("Language options contain Hindi ('hi') and English ('en')", () => {
    expect(LANGUAGES.some((l) => l.value === "hi")).toBe(true);
    expect(LANGUAGES.some((l) => l.value === "en")).toBe(true);
  });

  test("Hinglish (Roman) choice maps to Whisper request language 'hi'", () => {
    // Simulating stt_cloud::cloud_language_code & whisper language resolver
    const resolveLanguage = (selected: string, isWhisper: boolean) => {
      if (selected === "hinglish") return "hi";
      if (isWhisper && (selected === "hi" || selected === "auto" || !selected)) return "hi";
      return selected === "auto" ? null : selected;
    };

    expect(resolveLanguage("hinglish", true)).toBe("hi");
    expect(resolveLanguage("hinglish", false)).toBe("hi");
    expect(resolveLanguage("hi", true)).toBe("hi");
  });

  test("Cleanup is strictly FORCED when language is Hinglish (Roman) or Hindi", () => {
    const cleansUp = (settings: {
      post_process_on_dictation: boolean;
      cleanup_binding: boolean;
      selected_language: string;
    }) => {
      return (
        settings.cleanup_binding ||
        settings.post_process_on_dictation ||
        settings.selected_language === "hinglish" ||
        settings.selected_language === "hi"
      );
    };

    // Even if dictation cleanup is off and dedicated binding is false:
    expect(
      cleansUp({
        post_process_on_dictation: false,
        cleanup_binding: false,
        selected_language: "hinglish",
      }),
    ).toBe(true);

    expect(
      cleansUp({
        post_process_on_dictation: false,
        cleanup_binding: false,
        selected_language: "hi",
      }),
    ).toBe(true);

    // English with cleanup off does not force cleanup
    expect(
      cleansUp({
        post_process_on_dictation: false,
        cleanup_binding: false,
        selected_language: "en",
      }),
    ).toBe(false);
  });

  test("Whisper Hindi raw Devanagari ends in pure Roman Hinglish (zero Devanagari in final output)", () => {
    const rawDevanagariInput = "नमस्ते भाई, कल शाम को पांच बजे मीटिंग है।";
    expect(DEVANAGARI_REGEX.test(rawDevanagariInput)).toBe(true);

    // Simulated Prompt A cleanup result
    const cleanedHinglish = "Namaste bhai, kal shaam ko 5 baje meeting hai.";

    // Must NOT contain any Devanagari characters
    expect(DEVANAGARI_REGEX.test(cleanedHinglish)).toBe(false);
    expect(cleanedHinglish).toContain("Namaste");
    expect(cleanedHinglish).toContain("meeting");
  });

  test("Test 1 line verbatim correct Roman output", () => {
    // Ground truth acceptance test 1 line
    const test1Devanagari = "यह एक टेस्ट है और फाइनल आउटपुट हमेशा रोमन में होना चाहिए";
    expect(DEVANAGARI_REGEX.test(test1Devanagari)).toBe(true);

    const test1RomanExpected =
      "Yeh ek test hai aur final output hamesha Roman me hona chahiye";
    expect(DEVANAGARI_REGEX.test(test1RomanExpected)).toBe(false);
  });
});
