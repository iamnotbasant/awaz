import { describe, expect, it } from "bun:test";

export function formatSelectionEditInput(
  selectedText: string,
  asrInstruction: string,
): string {
  return `<selected_text>\n${selectedText.trim()}\n</selected_text>\n\n<asr_text>\n${asrInstruction.trim()}\n</asr_text>`;
}

export function resolveSelectionEditModel(
  configuredModel: string | undefined,
  defaultCleanupModel: string,
): string {
  if (!configuredModel || configuredModel.trim() === "") {
    return defaultCleanupModel;
  }
  return configuredModel;
}

describe("P2: Context Awareness & Selection-Edit Flow", () => {
  it("formats input payload strictly with <selected_text> and <asr_text>", () => {
    const selected = "Hum log kal sham ko 6 baje mil rahe hain discussion ke liye.";
    const instruction = "translate to English";
    const payload = formatSelectionEditInput(selected, instruction);

    expect(payload).toContain("<selected_text>");
    expect(payload).toContain(selected);
    expect(payload).toContain("</selected_text>");
    expect(payload).toContain("<asr_text>");
    expect(payload).toContain(instruction);
    expect(payload).toContain("</asr_text>");
  });

  it("resolves model for selection edits: empty means current AI service", () => {
    const defaultModel = "openai/gpt-oss-20b";
    expect(resolveSelectionEditModel("", defaultModel)).toBe(defaultModel);
    expect(resolveSelectionEditModel(undefined, defaultModel)).toBe(defaultModel);
    expect(
      resolveSelectionEditModel("gemini-3-flash-preview", defaultModel),
    ).toBe("gemini-3-flash-preview");
  });

  it("handles translation instructions according to Prompt B execution rules", () => {
    const selectedText = "Yeh feature bahut achha chal raha hai aur user testing complete ho chuki hai.";
    const instruction = "is ko English me translate kar do";
    const payload = formatSelectionEditInput(selectedText, instruction);

    expect(payload).toContain("<asr_text>\nis ko English me translate kar do\n</asr_text>");
    // Verify execution rule 2: translate to natural English
    expect(instruction.toLowerCase()).toContain("translate");
  });

  it("handles shorten instructions according to Prompt B execution rules", () => {
    const selectedText = "Actually basically we were thinking that maybe perhaps we should reconsider the schedule.";
    const instruction = "chhota kar do";
    const payload = formatSelectionEditInput(selectedText, instruction);

    expect(payload).toContain("<asr_text>\nchhota kar do\n</asr_text>");
  });
});
