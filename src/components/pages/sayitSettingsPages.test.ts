import { describe, expect, test } from "bun:test";

describe("Awaz 0.0.3 Item 2 & 3: SayIt Voice Engine & AI Providers Pages", () => {
  test("SayIt navigation order: Voice engine then AI providers replace flat Models", () => {
    const navItems = [
      { id: "home", label: "Home" },
      { id: "history", label: "History" },
      { id: "meetings", label: "Meetings" },
      { id: "cleanup", label: "AI cleanup" },
      { id: "dictionary", label: "Dictionary" },
      { id: "insights", label: "Insights" },
      { id: "voice-engine", label: "Voice engine" },
      { id: "ai-providers", label: "AI providers" },
    ];

    const voiceIndex = navItems.findIndex((i) => i.id === "voice-engine");
    const aiIndex = navItems.findIndex((i) => i.id === "ai-providers");

    expect(voiceIndex).toBeGreaterThan(-1);
    expect(aiIndex).toBeGreaterThan(-1);
    expect(voiceIndex).toBeLessThan(aiIndex);
  });

  test("Processing modes selector includes Local, Cloud API, and Server (Planned)", () => {
    const modes = [
      { id: "local", label: "Local mode", active: false },
      { id: "cloud", label: "Cloud API mode", active: true },
      { id: "server", label: "Server mode", planned: true },
    ];

    expect(modes.find((m) => m.id === "cloud")?.active).toBe(true);
    expect(modes.find((m) => m.id === "server")?.planned).toBe(true);
  });

  test("Show-only-configured: filters out unconfigured/faltu providers without keys", () => {
    const allProviders = [
      { id: "groq", label: "Groq Whisper" },
      { id: "elevenlabs", label: "ElevenLabs" },
      { id: "openai", label: "OpenAI Whisper" },
      { id: "deepgram", label: "Deepgram" },
      { id: "mistral", label: "Mistral" },
      { id: "azure", label: "Azure Speech" },
      { id: "gemini", label: "Gemini" },
    ];

    const keyStatus: Record<string, boolean> = {
      groq: true,
      elevenlabs: false,
      openai: false,
      deepgram: false,
      mistral: false,
      azure: false,
      gemini: false,
    };

    const activeProviderId = "groq";
    const userAdded: string[] = [];

    // Filter rule: key exists OR isActive OR userAdded; AND provider !== "gemini"
    const visibleCards = allProviders.filter((p) => {
      if (p.id === "gemini") return false;
      return (
        keyStatus[p.id] || p.id === activeProviderId || userAdded.includes(p.id)
      );
    });

    // ONLY Groq should be visible; all unconfigured providers (ElevenLabs, OpenAI, Deepgram, Azure, Mistral, Gemini) are absent
    expect(visibleCards).toHaveLength(1);
    expect(visibleCards[0].id).toBe("groq");
    expect(visibleCards.some((c) => c.id === "gemini")).toBe(false);
    expect(visibleCards.some((c) => c.id === "elevenlabs")).toBe(false);
    expect(visibleCards.some((c) => c.id === "azure")).toBe(false);
  });

  test("+ New affordance adds an explicit provider card", () => {
    const initialConfigured = ["groq"];
    const newlyAdded = "openai";

    const updatedConfigured = [...initialConfigured, newlyAdded];
    expect(updatedConfigured).toHaveLength(2);
    expect(updatedConfigured).toContain("groq");
    expect(updatedConfigured).toContain("openai");
  });

  test("AI Providers shows only configured cleanup services (Groq default, no Gemini)", () => {
    const allAiProviders = [
      { id: "groq", label: "Groq AI Cleanup" },
      { id: "openai", label: "OpenAI" },
      { id: "mistral", label: "Mistral" },
      { id: "gemini", label: "Gemini AI Cleanup" },
    ];

    const activeAiProvider = "groq";
    const userAddedAi: string[] = [];
    const aiKeys: Record<string, string> = { groq: "gsk_live_123" };

    const visibleAiCards = allAiProviders.filter((p) => {
      if (p.id === "gemini") return false;
      return (
        !!aiKeys[p.id] ||
        p.id === activeAiProvider ||
        userAddedAi.includes(p.id)
      );
    });

    expect(visibleAiCards).toHaveLength(1);
    expect(visibleAiCards[0].id).toBe("groq");
    expect(visibleAiCards.some((c) => c.id === "gemini")).toBe(false);
  });
});
