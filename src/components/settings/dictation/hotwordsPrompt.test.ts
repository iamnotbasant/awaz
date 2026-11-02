import { describe, expect, it } from "bun:test";

export function buildHotwordsPromptLayer(
  hotwords: string[],
  enabled: boolean,
): string | null {
  if (!enabled || !hotwords || hotwords.length === 0) {
    return null;
  }
  const terms = Array.from(
    new Set(hotwords.map((w) => w.trim()).filter((w) => w.length > 0)),
  ).sort();

  if (terms.length === 0) {
    return null;
  }

  return (
    `\n\n---\nUSER TERMINOLOGY & HOTWORDS\n` +
    `The following are specialized terms, proper nouns, and keywords specified by the user. ` +
    `If speech-to-text contains phonetically similar or misheard words, prioritize correcting ` +
    `them to the exact spelling and casing below and preserve them:\n` +
    terms.map((t) => `- ${t}`).join("\n")
  );
}

describe("P3: Send hotwords to AI prompt", () => {
  it("returns null when disabled regardless of hotwords presence", () => {
    expect(
      buildHotwordsPromptLayer(["PostgreSQL", "Tauri", "Zustand"], false),
    ).toBeNull();
  });

  it("returns null when enabled but hotwords list is empty or whitespace-only", () => {
    expect(buildHotwordsPromptLayer([], true)).toBeNull();
    expect(buildHotwordsPromptLayer(["", "  ", "\t\n"], true)).toBeNull();
  });

  it("deduplicates, trims, sorts and formats hotwords into markdown layer", () => {
    const list = [
      "Zustand",
      "  PostgreSQL  ",
      "Tauri",
      "PostgreSQL",
      "  ",
      "Awaz",
    ];
    const layer = buildHotwordsPromptLayer(list, true);
    expect(layer).not.toBeNull();
    expect(layer).toContain("USER TERMINOLOGY & HOTWORDS");
    expect(layer).toContain("- Awaz\n- PostgreSQL\n- Tauri\n- Zustand");
    // Should not contain duplicate entries
    const postgresMatches = layer?.match(/- PostgreSQL/g);
    expect(postgresMatches?.length).toBe(1);
  });

  it("preserves exact casing of specialized terms", () => {
    const list = ["ChatGPT", "iOS", "macOS", "gRPC", "TypeScript"];
    const layer = buildHotwordsPromptLayer(list, true);
    expect(layer).toContain("- ChatGPT");
    expect(layer).toContain("- iOS");
    expect(layer).toContain("- macOS");
    expect(layer).toContain("- gRPC");
    expect(layer).toContain("- TypeScript");
  });
});
