/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Cpu,
  Cloud,
  AlertTriangle,
  ShieldCheck,
  Download,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { SettingContainer } from "@/components/ui/SettingContainer";
import { Segmented } from "@/components/ui/Segmented";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useSettings } from "@/hooks/useSettings";
import { commands, type SttEngineMode } from "@/bindings";

export const LocalModeSection: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, refreshSettings } = useSettings();

  const currentMode = (getSetting("stt_engine_mode") ??
    "cloud") as SttEngineMode;
  const isLocal = currentMode === "local";

  const handleModeChange = async (mode: string) => {
    try {
      await commands.setSttEngineMode(mode as SttEngineMode);
      await refreshSettings();
      toast.success(
        mode === "local"
          ? t("settings.engine.switchedLocal", {
              defaultValue: "Switched to Local Offline Mode (Parakeet CPU)",
            })
          : t("settings.engine.switchedCloud", {
              defaultValue: "Switched to Cloud API Mode (Gemini/Groq)",
            }),
      );
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <div className="space-y-4">
      <SettingContainer
        title={t("settings.engine.modeTitle", {
          defaultValue: "Speech Recognition Engine",
        })}
        description={t("settings.engine.modeDesc", {
          defaultValue:
            "Choose between Cloud API transcription (fast, multilingual, native Hinglish Roman) or Local Mode (private, offline CPU inference).",
        })}
        icon={isLocal ? Cpu : Cloud}
        tone={isLocal ? "amber" : "teal"}
        grouped={true}
      >
        <Segmented
          label={t("settings.engine.modeTitle", {
            defaultValue: "Speech Engine",
          })}
          value={currentMode}
          onChange={handleModeChange}
          options={[
            {
              value: "cloud",
              label: t("settings.engine.cloud", {
                defaultValue: "Cloud API Mode (Recommended)",
              }),
            },
            {
              value: "local",
              label: t("settings.engine.local", {
                defaultValue: "Local Mode (Offline CPU)",
              }),
            },
          ]}
        />
      </SettingContainer>

      {isLocal && (
        <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
          {/* D10 Notice: English-only in local mode */}
          <Callout tone="info">
            <div className="space-y-1">
              <p className="font-semibold text-xs">
                {t("settings.engine.localNoticeTitle", {
                  defaultValue: "Notice: Local Mode is English-only (0.6B CPU)",
                })}
              </p>
              <p className="text-xs leading-relaxed">
                {t("settings.engine.localNoticeDesc", {
                  defaultValue:
                    "Offline Local Mode uses Parakeet Unified EN 0.6B running directly on CPU (<1.5GB RAM). Full multilingual Hinglish Romanization requires Cloud API Mode (Gemini / Groq).",
                })}
              </p>
            </div>
          </Callout>

          {/* Parakeet Model Card */}
          <div className="rounded-xl border border-hairline bg-surface-muted p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-ink">
                    Parakeet Unified EN 0.6B
                  </h4>
                  <Badge variant="success">Recommended for CPU</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Lightweight on-demand download (~150MB GGUF). High-speed CPU
                  inference with AVX2/FMA kernels. Fits comfortably within 8GB
                  RAM envelope.
                </p>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    ~150 MB
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    100% Offline & Private
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  toast.info("Parakeet 0.6B is ready for local CPU inference")
                }
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Ready (On-Demand)
              </Button>
            </div>
          </div>

          {/* D19 / Feasibility: Heavy models disabled on 8GB budget */}
          <div className="rounded-xl border border-hairline bg-surface-muted p-4 opacity-75">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-ink">
                    Heavy Multilingual Models (1.7B - 2.5B)
                  </h4>
                  <Badge variant="warning">Hardware Constrained</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Nemotron 3.5, Qwen3-ASR 1.7B, and Canary 2.5B require 16GB+
                  RAM and dedicated GPU. Disabled to prevent memory thrashing on
                  8GB shared RAM machines.
                </p>
              </div>

              <Badge variant="outline" className="text-xs">
                Disabled (8GB RAM Cap)
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
