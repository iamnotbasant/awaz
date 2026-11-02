import { describe, expect, it } from "bun:test";
import { BUILTIN_PRESET_METADATA, type PresetDefinition } from "./PromptPresetManager";

describe("P4: Presets UI Parity & Management", () => {
  it("contains all 5 built-in presets: Intent, Faithful, Chinese to English, Conversational, and Hinglish Roman", () => {
    const ids = BUILTIN_PRESET_METADATA.map((p) => p.id);
    expect(ids).toContain("intent");
    expect(ids).toContain("faithful");
    expect(ids).toContain("zh2en");
    expect(ids).toContain("casual");
    expect(ids).toContain("hinglish_roman");
    expect(BUILTIN_PRESET_METADATA.length).toBe(5);
  });

  it("marks all 5 presets as Built in, and Hinglish Roman as Default", () => {
    for (const preset of BUILTIN_PRESET_METADATA) {
      expect(preset.builtin).toBe(true);
    }
    const hinglish = BUILTIN_PRESET_METADATA.find((p) => p.id === "hinglish_roman");
    expect(hinglish).toBeDefined();
    expect(hinglish?.isDefault).toBe(true);

    const intent = BUILTIN_PRESET_METADATA.find((p) => p.id === "intent");
    expect(intent?.isDefault).toBeFalsy();
  });

  it("provides bilingual English and Chinese names and descriptions matching SayIt", () => {
    const intent = BUILTIN_PRESET_METADATA.find((p) => p.id === "intent")!;
    expect(intent.nameEn).toBe("Intent cleanup");
    expect(intent.nameZh).toBe("意图整理");
    expect(intent.descEn).toContain("Removes fillers and repetition");
    expect(intent.descZh).toContain("去除口语填充词");

    const faithful = BUILTIN_PRESET_METADATA.find((p) => p.id === "faithful")!;
    expect(faithful.nameEn).toBe("Faithful cleanup");
    expect(faithful.nameZh).toBe("忠实校对");

    const zh2en = BUILTIN_PRESET_METADATA.find((p) => p.id === "zh2en")!;
    expect(zh2en.nameEn).toBe("Chinese to English");
    expect(zh2en.nameZh).toBe("中翻英忠实校对");

    const casual = BUILTIN_PRESET_METADATA.find((p) => p.id === "casual")!;
    expect(casual.nameEn).toBe("Conversational cleanup");
    expect(casual.nameZh).toBe("口语化整理");

    const hinglish = BUILTIN_PRESET_METADATA.find((p) => p.id === "hinglish_roman")!;
    expect(hinglish.nameEn).toBe("Hinglish Roman");
    expect(hinglish.nameZh).toBe("印英语音转罗马字");
  });

  it("resolves active preset display according to tab language", () => {
    const getPresetDisplay = (meta: PresetDefinition, lang: "en" | "zh") => ({
      name: lang === "zh" ? meta.nameZh : meta.nameEn,
      desc: lang === "zh" ? meta.descZh : meta.descEn,
    });

    const casual = BUILTIN_PRESET_METADATA.find((p) => p.id === "casual")!;
    const enDisplay = getPresetDisplay(casual, "en");
    expect(enDisplay.name).toBe("Conversational cleanup");
    expect(enDisplay.desc).toContain("Keeps your spoken tone");

    const zhDisplay = getPresetDisplay(casual, "zh");
    expect(zhDisplay.name).toBe("口语化整理");
    expect(zhDisplay.desc).toContain("保留口语化语气");
  });

  it("handles custom preset list separation and identification", () => {
    const builtinIds = new Set(BUILTIN_PRESET_METADATA.map((p) => p.id));
    const allPrompts = [
      { id: "hinglish_roman", name: "Hinglish Roman", prompt: "..." },
      { id: "intent", name: "Intent cleanup", prompt: "..." },
      { id: "custom_meeting", name: "Executive Meeting", prompt: "Summarize into bullet points." },
      { id: "custom_code", name: "Code Review", prompt: "Format as git diff feedback." },
    ];

    const customPrompts = allPrompts.filter((p) => !builtinIds.has(p.id));
    expect(customPrompts.length).toBe(2);
    expect(customPrompts[0].name).toBe("Executive Meeting");
    expect(customPrompts[1].name).toBe("Code Review");
  });
});
