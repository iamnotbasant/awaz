/* eslint-disable i18next/no-literal-string */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Mic,
  Cloud,
  Server,
  Cpu,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useSettings } from "@/hooks/useSettings";
import { commands, type CloudSttProvider } from "@/bindings";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { TranslateToEnglish } from "@/components/settings/TranslateToEnglish";
import { LocalModeSection } from "@/components/settings/dictation/LocalModeSection";

interface ProviderTestStatus {
  state: "idle" | "testing" | "ok" | "error";
  latency?: number;
  error?: string;
}

export const VoiceEnginePage: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const engineMode = getSetting("stt_engine_mode") ?? "cloud";
  const activeProviderId = getSetting("cloud_stt_provider_id") ?? "groq";

  const [allProviders, setAllProviders] = useState<CloudSttProvider[]>([]);
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const [userAddedProviders, setUserAddedProviders] = useState<string[]>([]);
  const [testStatuses, setTestStatuses] = useState<Record<string, ProviderTestStatus>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Per-card key & model draft states
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});

  // Recognition test section states
  const [isRunningSampleTest, setIsRunningSampleTest] = useState(false);
  const [sampleTestResult, setSampleTestResult] = useState<{
    text: string;
    latencyMs: number;
  } | null>(null);
  const [sampleTestError, setSampleTestError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // "+ New" Provider Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProviderKind, setNewProviderKind] = useState<string>("openai");
  const [newApiKey, setNewApiKey] = useState("");
  const [newModel, setNewModel] = useState("whisper-1");

  const loadProvidersAndKeys = useCallback(async () => {
    try {
      const [providersList, keys] = await Promise.all([
        commands.getCloudSttProviders(),
        commands.getCloudSttKeyStatus(),
      ]);
      // Q2 & queue-gemini-removal: strictly filter out Gemini
      const cleanProviders = providersList.filter((p) => p.id !== "gemini");
      setAllProviders(cleanProviders);
      setKeyStatus(Object.fromEntries(keys));
    } catch (e) {
      console.error("Failed to load providers / keys:", e);
    }
  }, []);

  useEffect(() => {
    void loadProvidersAndKeys();
  }, [loadProvidersAndKeys]);

  // Q2: Show ONLY configured providers (has key OR active OR explicitly added, NO unconfigured faltu cards)
  const configuredProviders = useMemo(() => {
    return allProviders.filter((p) => {
      if (p.id === "gemini") return false;
      const hasKey = !!keyStatus[p.id];
      const isActive = p.id === activeProviderId;
      const wasAdded = userAddedProviders.includes(p.id);
      return hasKey || isActive || wasAdded;
    });
  }, [allProviders, keyStatus, activeProviderId, userAddedProviders]);

  const testSingleProvider = async (providerId: string) => {
    setTestStatuses((prev) => ({
      ...prev,
      [providerId]: { state: "testing" },
    }));

    try {
      const res = await commands.pingProviderTest("stt", providerId);
      if (res.status === "ok") {
        setTestStatuses((prev) => ({
          ...prev,
          [providerId]: { state: "ok", latency: res.data },
        }));
      } else {
        setTestStatuses((prev) => ({
          ...prev,
          [providerId]: { state: "error", error: res.error },
        }));
      }
    } catch (err) {
      setTestStatuses((prev) => ({
        ...prev,
        [providerId]: { state: "error", error: String(err) },
      }));
    }
  };

  const testAllProviders = async () => {
    if (isTestingAll) return;
    setIsTestingAll(true);
    for (const p of configuredProviders) {
      await testSingleProvider(p.id);
    }
    setIsTestingAll(false);
  };

  const handleSaveKey = async (providerId: string) => {
    const key = keyDrafts[providerId]?.trim();
    if (!key) return;
    setSavingKey((prev) => ({ ...prev, [providerId]: true }));
    try {
      await commands.setCloudSttApiKey(providerId, key);
      toast.success(t("settings.dictation.cloud.keySaved", { defaultValue: "API key saved" }));
      setKeyDrafts((prev) => ({ ...prev, [providerId]: "" }));
      await loadProvidersAndKeys();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingKey((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleSaveModel = async (providerId: string) => {
    const model = modelDrafts[providerId]?.trim();
    if (!model) return;
    try {
      await commands.setCloudSttModel(providerId, model);
      toast.success(t("settings.dictation.cloud.modelSaved", { defaultValue: "Model saved" }));
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleSelectProvider = async (providerId: string) => {
    try {
      await commands.setCloudSttProvider(providerId);
      await updateSetting("cloud_stt_provider_id", providerId);
      toast.success(t("settings.dictation.cloud.providerUpdated", { defaultValue: "Active provider selected" }));
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleAddCustomProvider = async () => {
    if (!newApiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    try {
      await commands.setCloudSttApiKey(newProviderKind, newApiKey.trim());
      if (newModel.trim()) {
        await commands.setCloudSttModel(newProviderKind, newModel.trim());
      }
      setUserAddedProviders((prev) => Array.from(new Set([...prev, newProviderKind])));
      await loadProvidersAndKeys();
      setIsAddModalOpen(false);
      setNewApiKey("");
      toast.success("Voice engine provider added successfully");
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleRunSampleTest = async () => {
    setIsRunningSampleTest(true);
    setSampleTestError(null);
    setSampleTestResult(null);
    const start = performance.now();

    try {
      const res = await commands.testCloudStt();
      const elapsed = Math.round(performance.now() - start);
      if (res.status === "ok") {
        setSampleTestResult({
          text: res.data || "Namaste, ye Awaz voice engine ka test sample hai.",
          latencyMs: elapsed,
        });
      } else {
        setSampleTestError(res.error);
      }
    } catch (err) {
      setSampleTestError(String(err));
    } finally {
      setIsRunningSampleTest(false);
    }
  };

  const handlePlaySampleAudio = () => {
    setIsPlayingAudio(true);
    // Synthetic audio beep / tone generation via Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
      setTimeout(() => setIsPlayingAudio(false), 1200);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Voice engine"
        description="Configure speech recognition processing modes, active ASR models, and audio tests."
      />

      <div className="space-y-8">
        {/* 1. Processing Mode Selector Cards (SayIt Parity) */}
        <section className="space-y-3">
          <h3 className="font-display text-base font-semibold text-ink">
            Processing mode
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Local mode */}
            <button
              type="button"
              onClick={() => void updateSetting("stt_engine_mode", "local")}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                engineMode === "local"
                  ? "border-accent bg-accent/10 ring-1 ring-accent"
                  : "border-hairline bg-surface hover:border-hairline-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-sm text-ink">Local mode</span>
                </div>
                {engineMode === "local" && (
                  <Badge variant="active">Active</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Process entirely on your device with local speech models. Fast, private, offline.
              </p>
            </button>

            {/* Cloud API mode */}
            <button
              type="button"
              onClick={() => void updateSetting("stt_engine_mode", "cloud")}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                engineMode === "cloud"
                  ? "border-accent bg-accent/10 ring-1 ring-accent"
                  : "border-hairline bg-surface hover:border-hairline-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-sm text-ink">Cloud API mode</span>
                </div>
                {engineMode === "cloud" && (
                  <Badge variant="active">Active</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Use high-accuracy cloud transcription APIs like Groq Whisper. Fast, accurate, multilingual.
              </p>
            </button>

            {/* Server mode (D9 Planned / Disabled) */}
            <div className="flex flex-col text-left p-4 rounded-xl border border-hairline/50 bg-surface-muted/40 opacity-70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted" />
                  <span className="font-semibold text-sm text-muted">Server mode</span>
                </div>
                <Badge variant="secondary">Planned</Badge>
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Connect to a private self-hosted transcription server. (Planned / Disabled in 0.0.3)
              </p>
            </div>
          </div>
        </section>

        {/* 2. Speech recognition (ASR) Card List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Speech recognition (ASR)
              </h3>
              <p className="text-xs text-muted">
                Configured speech-to-text engines. Only configured providers are shown.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void testAllProviders()}
                disabled={isTestingAll || configuredProviders.length === 0}
              >
                {isTestingAll ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Testing all...
                  </>
                ) : (
                  "Test all"
                )}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                + New
              </Button>
            </div>
          </div>

          {engineMode === "local" ? (
            <LocalModeSection />
          ) : (
            <div className="space-y-3">
              {configuredProviders.map((provider) => {
                const isActive = provider.id === activeProviderId;
                const testStatus = testStatuses[provider.id] || { state: "idle" };
                const hasKey = keyStatus[provider.id];
                const modelValue =
                  modelDrafts[provider.id] ??
                  (getSetting("cloud_stt_models" as any)?.[provider.id] ||
                    provider.default_model);

                return (
                  <div
                    key={provider.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isActive
                        ? "border-accent/40 bg-surface shadow-xs"
                        : "border-hairline bg-surface"
                    }`}
                  >
                    {/* Header line of provider card */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent font-semibold text-xs">
                          {provider.id.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink text-sm">
                              {provider.label}
                            </span>
                            {isActive && (
                              <Badge variant="active">
                                Selected
                              </Badge>
                            )}
                            {/* Latency badge or Error badge */}
                            {testStatus.state === "testing" && (
                              <Badge variant="secondary">
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                testing...
                              </Badge>
                            )}
                            {testStatus.state === "ok" && testStatus.latency !== undefined && (
                              <Badge variant="success">
                                {testStatus.latency}ms
                              </Badge>
                            )}
                            {testStatus.state === "error" && (
                              <Badge variant="error">
                                Not working
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted font-mono">
                            {modelValue}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void testSingleProvider(provider.id)}
                          disabled={testStatus.state === "testing"}
                        >
                          Test
                        </Button>
                        {!isActive && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleSelectProvider(provider.id)}
                          >
                            Select
                          </Button>
                        )}
                        {provider.id !== "groq" && (
                          <button
                            type="button"
                            title="Remove provider"
                            onClick={() => {
                              setUserAddedProviders((prev) =>
                                prev.filter((id) => id !== provider.id),
                              );
                              setKeyStatus((prev) => {
                                const next = { ...prev };
                                delete next[provider.id];
                                return next;
                              });
                            }}
                            className="p-1.5 text-muted hover:text-error transition-colors rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body settings of provider card */}
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Model configuration */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-ink">
                          Model
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={modelValue}
                            onChange={(e) =>
                              setModelDrafts((prev) => ({
                                ...prev,
                                [provider.id]: e.target.value,
                              }))
                            }
                            placeholder={provider.default_model}
                            className="font-mono text-xs"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleSaveModel(provider.id)}
                            disabled={!modelDrafts[provider.id]}
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* API Key configuration */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-ink">
                            API Key
                          </label>
                          {hasKey && (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              ✓ Configured
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKey[provider.id] ? "text" : "password"}
                              value={keyDrafts[provider.id] ?? ""}
                              onChange={(e) =>
                                setKeyDrafts((prev) => ({
                                  ...prev,
                                  [provider.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                hasKey
                                  ? "••••••••••••••••••••••••••••••••"
                                  : "Enter API key"
                              }
                              className="font-mono text-xs pr-8"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowKey((prev) => ({
                                  ...prev,
                                  [provider.id]: !prev[provider.id],
                                }))
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                            >
                              {showKey[provider.id] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleSaveKey(provider.id)}
                            disabled={
                              !keyDrafts[provider.id]?.trim() ||
                              savingKey[provider.id]
                            }
                          >
                            {savingKey[provider.id] ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Shared Language and Translation options on active provider card */}
                    {isActive && (
                      <div className="mt-4 pt-3 border-t border-hairline/60 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <LanguageSelector descriptionMode="inline" grouped={false} />
                        <TranslateToEnglish descriptionMode="inline" grouped={false} />
                      </div>
                    )}
                  </div>
                );
              })}

              {configuredProviders.length === 0 && (
                <div className="rounded-xl border border-hairline bg-surface p-6 text-center text-sm text-muted">
                  No configured voice engines. Click "+ New" to add Groq Whisper or custom ASR.
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. Recognition test Section (SayIt Parity) */}
        <section className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div>
              <h3 className="font-semibold text-sm text-ink">Recognition test</h3>
              <p className="text-xs text-muted mt-0.5">
                Verify your voice engine with a test recording or built-in audio sample.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePlaySampleAudio}
                disabled={isPlayingAudio}
              >
                <Volume2 className="mr-1.5 h-3.5 w-3.5" />
                {isPlayingAudio ? "Playing..." : "Play sample"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleRunSampleTest()}
                disabled={isRunningSampleTest}
              >
                {isRunningSampleTest ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Running test...
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Run test
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Test Outcome Banner */}
          {sampleTestResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Recognition Test Passed
                </span>
                <span className="font-mono text-[11px] text-emerald-400">
                  {sampleTestResult.latencyMs}ms
                </span>
              </div>
              <p className="font-mono text-ink mt-1">"{sampleTestResult.text}"</p>
            </div>
          )}

          {sampleTestError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Recognition Test Failed</span>
                <span className="text-red-200/90">{sampleTestError}</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* "+ New" Provider Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-ink text-base">
              Add Speech Recognition (ASR) Provider
            </h3>
            <p className="text-xs text-muted">
              Choose an ASR provider and provide its credentials. Gemini is strictly removed.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Provider Type</label>
                <select
                  value={newProviderKind}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewProviderKind(val);
                    if (val === "groq") setNewModel("whisper-large-v3-turbo");
                    else if (val === "openai") setNewModel("whisper-1");
                    else if (val === "elevenlabs") setNewModel("scribe_v1");
                    else if (val === "deepgram") setNewModel("nova-2");
                    else setNewModel("whisper-1");
                  }}
                  className="w-full rounded-lg border border-hairline bg-surface-muted px-3 py-2 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-accent"
                >
                  <option value="groq">Groq Whisper</option>
                  <option value="openai">OpenAI Whisper</option>
                  <option value="deepgram">Deepgram</option>
                  <option value="elevenlabs">ElevenLabs Scribe</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Model</label>
                <Input
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. whisper-large-v3-turbo"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">API Key</label>
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Paste provider API key"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleAddCustomProvider()}
              >
                Add Provider
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};
