import { describe, expect, it } from "bun:test";
import type { AppPromptRule } from "@/bindings";

export function matchAppRule(
  rules: AppPromptRule[],
  processName: string,
): AppPromptRule | null {
  const procLower = processName.trim().toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const pattern of rule.processNames) {
      const p = pattern.trim().toLowerCase();
      if (
        procLower === p ||
        procLower.endsWith(`/${p}`) ||
        procLower.endsWith(`\\${p}`)
      ) {
        return rule;
      }
    }
  }
  return null;
}

describe("P5: Per-App Rules & Process Matching", () => {
  const builtins: AppPromptRule[] = [
    {
      id: "teams",
      name: "Teams",
      processNames: ["teams.exe", "ms-teams.exe"],
      presetId: "intent",
      promptAppend:
        "Adapted for instant collaboration chat. Output concise, clear messages ready to send directly, keeping tone natural and avoiding email formality.",
      enabled: false,
      builtin: true,
    },
    {
      id: "outlook",
      name: "Outlook",
      processNames: ["outlook.exe", "olk.exe"],
      presetId: "intent",
      promptAppend:
        "Adapted for professional email drafting. Maintain a formal, complete tone with natural paragraphing without inventing recipients or greetings.",
      enabled: false,
      builtin: true,
    },
    {
      id: "kiro",
      name: "Kiro",
      processNames: ["kiro.exe"],
      presetId: "faithful",
      promptAppend:
        "Optimized for developer tools. Preserve code, commands, filenames, paths, technical identifiers, and markdown formatting.",
      enabled: false,
      builtin: true,
    },
  ];

  it("contains Teams, Outlook, and Kiro built-ins OFF by default", () => {
    expect(builtins.length).toBe(3);
    for (const rule of builtins) {
      expect(rule.builtin).toBe(true);
      expect(rule.enabled).toBe(false);
    }
  });

  it("does not match any process when rules are disabled (OFF by default)", () => {
    expect(matchAppRule(builtins, "teams.exe")).toBeNull();
    expect(matchAppRule(builtins, "ms-teams.exe")).toBeNull();
    expect(matchAppRule(builtins, "outlook.exe")).toBeNull();
    expect(matchAppRule(builtins, "olk.exe")).toBeNull();
    expect(matchAppRule(builtins, "kiro.exe")).toBeNull();
  });

  it("matches Teams rule when enabled, handling multi-process aliases and case-insensitivity", () => {
    const rules = builtins.map((r) =>
      r.id === "teams" ? { ...r, enabled: true } : r,
    );

    const match1 = matchAppRule(rules, "teams.exe");
    expect(match1).not.toBeNull();
    expect(match1?.id).toBe("teams");
    expect(match1?.presetId).toBe("intent");

    const match2 = matchAppRule(rules, "MS-TEAMS.EXE");
    expect(match2).not.toBeNull();
    expect(match2?.id).toBe("teams");

    const matchPath = matchAppRule(
      rules,
      "C:\\Program Files\\WindowsApps\\MicrosoftTeams\\ms-teams.exe",
    );
    expect(matchPath).not.toBeNull();
    expect(matchPath?.id).toBe("teams");
  });

  it("matches Outlook rule when enabled, handling olk.exe modern Outlook", () => {
    const rules = builtins.map((r) =>
      r.id === "outlook" ? { ...r, enabled: true } : r,
    );

    const match1 = matchAppRule(rules, "outlook.exe");
    expect(match1?.id).toBe("outlook");

    const match2 = matchAppRule(rules, "olk.exe");
    expect(match2?.id).toBe("outlook");
    expect(match2?.promptAppend).toContain(
      "Adapted for professional email drafting",
    );
  });

  it("matches Kiro rule when enabled with faithful preset and dev prompt append", () => {
    const rules = builtins.map((r) =>
      r.id === "kiro" ? { ...r, enabled: true } : r,
    );

    const match = matchAppRule(rules, "kiro.exe");
    expect(match?.id).toBe("kiro");
    expect(match?.presetId).toBe("faithful");
    expect(match?.promptAppend).toContain("Optimized for developer tools");
  });

  it("supports user custom rules with priority matching", () => {
    const customRule: AppPromptRule = {
      id: "custom_code",
      name: "VS Code",
      processNames: ["code.exe", "code-insiders.exe"],
      presetId: "casual",
      promptAppend: "Format as clean code instructions.",
      enabled: true,
      builtin: false,
    };

    const rules = [customRule, ...builtins];
    const match = matchAppRule(rules, "code.exe");
    expect(match?.id).toBe("custom_code");
    expect(match?.presetId).toBe("casual");
    expect(match?.builtin).toBe(false);
  });
});
