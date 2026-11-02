import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, CheckCircle, AlertCircle, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { commands } from "@/bindings";

export interface ProviderStatus {
  id: string;
  kind: "stt" | "cleanup";
  label: string;
  model: string;
  latency?: number;
  error?: string;
  state: "idle" | "testing" | "ok" | "error";
}

const SHIPPED_TEST_PROVIDERS: ProviderStatus[] = [
  {
    id: "gemini",
    kind: "stt",
    label: "Gemini 3.5 Transcribe (Native)",
    model: "gemini-3.5-transcribe",
    state: "idle",
  },
  {
    id: "groq",
    kind: "stt",
    label: "Groq Whisper (Cloud ASR)",
    model: "whisper-large-v3-turbo",
    state: "idle",
  },
  {
    id: "groq",
    kind: "cleanup",
    label: "Groq AI Cleanup",
    model: "openai/gpt-oss-20b",
    state: "idle",
  },
  {
    id: "gemini",
    kind: "cleanup",
    label: "Gemini AI Cleanup",
    model: "gemini-3-flash-preview",
    state: "idle",
  },
  {
    id: "custom",
    kind: "stt",
    label: "Custom OpenAI ASR",
    model: "whisper-1",
    state: "idle",
  },
  {
    id: "custom",
    kind: "cleanup",
    label: "Custom OpenAI Cleanup",
    model: "gpt-4o-mini",
    state: "idle",
  },
];

export const ProviderTestMatrix: React.FC = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderStatus[]>(SHIPPED_TEST_PROVIDERS);
  const [isTestingAll, setIsTestingAll] = useState(false);

  const testSingleProvider = async (index: number) => {
    const target = providers[index];
    if (!target) return;

    setProviders((prev) =>
      prev.map((p, i) => (i === index ? { ...p, state: "testing", error: undefined } : p))
    );

    try {
      const res = await commands.pingProviderTest(target.kind, target.id);
      if (res.status === "ok") {
        setProviders((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, state: "ok", latency: res.data, error: undefined } : p
          )
        );
      } else {
        setProviders((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, state: "error", error: res.error, latency: undefined } : p
          )
        );
      }
    } catch (err) {
      setProviders((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, state: "error", error: String(err), latency: undefined }
            : p
        )
      );
    }
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    for (let i = 0; i < providers.length; i++) {
      await testSingleProvider(i);
    }
    setIsTestingAll(false);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <h3 className="font-semibold text-ink text-sm">
              {t("settings.providers.matrixTitle", { defaultValue: "Provider Grid & Latency Benchmarks" })}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            {t("settings.providers.matrixDesc", {
              defaultValue:
                "Measure live round-trip latency to cloud speech recognition and AI cleanup endpoints.",
            })}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => void handleTestAll()}
          disabled={isTestingAll}
          className="gap-1.5"
        >
          {isTestingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {t("settings.providers.testAll", { defaultValue: "Test All Providers" })}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {providers.map((p, idx) => (
          <div
            key={`${p.kind}-${p.id}-${p.label}`}
            className="flex flex-col justify-between rounded-xl border border-hairline bg-surface-muted p-3.5 transition-colors hover:border-hairline-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {p.kind === "stt" ? "ASR" : "Cleanup"}
                  </span>
                  <span className="text-xs text-hairline-strong">•</span>
                  <span className="text-sm font-medium text-ink">{p.label}</span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted">{p.model}</p>
              </div>

              <div>
                {p.state === "idle" && (
                  <Badge variant="outline">
                    {t("settings.providers.untested", { defaultValue: "Untested" })}
                  </Badge>
                )}
                {p.state === "testing" && (
                  <Badge variant="active" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("settings.providers.testing", { defaultValue: "Testing..." })}
                  </Badge>
                )}
                {p.state === "ok" && (
                  <Badge variant="success" className="gap-1 font-mono">
                    <CheckCircle className="h-3 w-3" />
                    {p.latency}ms
                  </Badge>
                )}
                {p.state === "error" && (
                  <Badge variant="error" className="gap-1" title={p.error}>
                    <AlertCircle className="h-3 w-3" />
                    {t("settings.providers.notWorking", { defaultValue: "Not working" })}
                  </Badge>
                )}
              </div>
            </div>

            {p.state === "error" && p.error && (
              <p className="mt-2 text-[11px] text-error line-clamp-2" title={p.error}>
                {p.error}
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void testSingleProvider(idx)}
                disabled={p.state === "testing" || isTestingAll}
                className="text-xs py-1 h-7"
              >
                {t("common.test", { defaultValue: "Test" })}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
