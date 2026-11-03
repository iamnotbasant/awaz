/* eslint-disable i18next/no-literal-string */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Bot,
  Loader2,
  Plus,
  Trash2,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useSettings } from "@/hooks/useSettings";
import { commands, type PostProcessProvider } from "@/bindings";
import { PostProcessTimeout } from "@/components/settings/PostProcessTimeout";
import { ThinkingLevelSetting } from "@/components/settings/ThinkingLevelSetting";

interface ProviderTestStatus {
  state: "idle" | "testing" | "ok" | "error";
  latency?: number;
  error?: string;
}

const DEFAULT_POST_PROCESS_PROVIDERS: PostProcessProvider[] = [
  {
    id: "groq",
    label: "Groq",
    base_url: "https://api.groq.com/openai/v1",
    models_endpoint: "/models",
    supports_structured_output: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    models_endpoint: "/models",
    supports_structured_output: true,
  },
  {
    id: "mistral",
    label: "Mistral AI",
    base_url: "https://api.mistral.ai/v1",
    models_endpoint: "/models",
    supports_structured_output: false,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    base_url: "https://api.anthropic.com/v1",
    models_endpoint: null,
    supports_structured_output: false,
  },
  {
    id: "custom",
    label: "Custom",
    base_url: "http://localhost:11434/v1",
    models_endpoint: "/models",
    supports_structured_output: false,
  },
];

export const AiProvidersPage: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();

  const activeProviderId = getSetting("post_process_provider_id") ?? "groq";

  const [allProviders, setAllProviders] = useState<PostProcessProvider[]>(
    DEFAULT_POST_PROCESS_PROVIDERS,
  );
  const [userAddedProviders, setUserAddedProviders] = useState<string[]>([]);
  const [testStatuses, setTestStatuses] = useState<Record<string, ProviderTestStatus>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Per-card drafts
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});

  // "+ New" Service Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProviderKind, setNewProviderKind] = useState<string>("openai");
  const [newApiKey, setNewApiKey] = useState("");
  const [newModel, setNewModel] = useState("gpt-4o-mini");

  const configuredProviders = useMemo(() => {
    // Q2 & queue-gemini-removal: Groq is active default; show ONLY configured, Gemini strictly removed
    const storedKeys = getSetting("post_process_api_keys" as any) || {};
    return allProviders.filter((p) => {
      if (p.id === "gemini") return false;
      const hasKey = !!storedKeys[p.id]?.trim();
      const isActive = p.id === activeProviderId;
      const wasAdded = userAddedProviders.includes(p.id);
      return hasKey || isActive || wasAdded;
    });
  }, [allProviders, activeProviderId, userAddedProviders, getSetting]);

  const testSingleProvider = async (providerId: string) => {
    setTestStatuses((prev) => ({
      ...prev,
      [providerId]: { state: "testing" },
    }));

    try {
      const res = await commands.pingProviderTest("cleanup", providerId);
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
      await commands.changePostProcessApiKeySetting(providerId, key);
      toast.success(t("settings.postProcessing.api.keySaved", { defaultValue: "API key saved" }));
      setKeyDrafts((prev) => ({ ...prev, [providerId]: "" }));
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
      await commands.changePostProcessModelSetting(providerId, model);
      toast.success(t("settings.postProcessing.api.modelSaved", { defaultValue: "Model saved" }));
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleSelectProvider = async (providerId: string) => {
    try {
      await commands.setPostProcessProvider(providerId);
      await updateSetting("post_process_provider_id", providerId);
      toast.success("Active AI service selected");
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
      await commands.changePostProcessApiKeySetting(newProviderKind, newApiKey.trim());
      if (newModel.trim()) {
        await commands.changePostProcessModelSetting(newProviderKind, newModel.trim());
      }
      setUserAddedProviders((prev) => Array.from(new Set([...prev, newProviderKind])));
      setIsAddModalOpen(false);
      setNewApiKey("");
      toast.success("AI service added successfully");
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <Page>
      <PageHeader
        title="AI providers"
        description="Configure AI services for intelligent post-processing, cleanup, and Romanization."
      />

      <div className="space-y-8">
        {/* 1. AI services Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                AI services
              </h3>
              <p className="text-xs text-muted">
                Configured cleanup providers. Only configured services are shown.
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

          <div className="space-y-3">
            {configuredProviders.map((provider) => {
              const isActive = provider.id === activeProviderId;
              const testStatus = testStatuses[provider.id] || { state: "idle" };
              const storedKeys = getSetting("post_process_api_keys" as any) || {};
              const hasKey = !!storedKeys[provider.id]?.trim();
              const storedModels = getSetting("post_process_models" as any) || {};
              const modelValue =
                modelDrafts[provider.id] ??
                (storedModels[provider.id] ||
                  (provider.id === "groq" ? "openai/gpt-oss-20b" : "gpt-4o-mini"));

              return (
                <div
                  key={provider.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    isActive
                      ? "border-accent/40 bg-surface shadow-xs"
                      : "border-hairline bg-surface"
                  }`}
                >
                  {/* Header of AI service card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent font-semibold text-xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-sm">
                            {provider.id === "groq" ? "Groq AI Cleanup" : provider.label}
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
                          }}
                          className="p-1.5 text-muted hover:text-error transition-colors rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body fields of AI service card */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Model selector */}
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
                          placeholder="e.g. openai/gpt-oss-20b"
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

                    {/* API Key */}
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
                </div>
              );
            })}

            {configuredProviders.length === 0 && (
              <div className="rounded-xl border border-hairline bg-surface p-6 text-center text-sm text-muted">
                No configured AI services. Click "+ New" to add Groq AI Cleanup or custom LLM service.
              </div>
            )}
          </div>
        </section>

        {/* 2. Performance & Timeout Section */}
        <section className="space-y-4 rounded-2xl border border-hairline bg-surface p-5">
          <h3 className="font-semibold text-sm text-ink border-b border-hairline pb-3">
            Performance & Timeout
          </h3>
          <ThinkingLevelSetting
            job="cleanup"
            providerId={activeProviderId}
            grouped={true}
          />
          <PostProcessTimeout grouped={true} />
        </section>
      </div>

      {/* "+ New" AI Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-ink text-base">
              Add AI Service Provider
            </h3>
            <p className="text-xs text-muted">
              Choose an AI cleanup service and enter credentials. Gemini is strictly removed.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Provider Type</label>
                <select
                  value={newProviderKind}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewProviderKind(val);
                    if (val === "groq") setNewModel("openai/gpt-oss-20b");
                    else if (val === "openai") setNewModel("gpt-4o-mini");
                    else if (val === "mistral") setNewModel("mistral-small-latest");
                    else if (val === "anthropic") setNewModel("claude-3-5-haiku-20241022");
                    else setNewModel("gpt-4o-mini");
                  }}
                  className="w-full rounded-lg border border-hairline bg-surface-muted px-3 py-2 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-accent"
                >
                  <option value="groq">Groq</option>
                  <option value="openai">OpenAI</option>
                  <option value="mistral">Mistral AI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Model</label>
                <Input
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. openai/gpt-oss-20b"
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
                Add Service
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};
