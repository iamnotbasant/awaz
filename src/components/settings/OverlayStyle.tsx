/* eslint-disable i18next/no-literal-string */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { SettingContainer } from "@/components/ui/SettingContainer";
import { useSettings } from "@/hooks/useSettings";
import { useModelStore } from "@/stores/modelStore";
import type { OverlayStyle as OverlayStyleValue } from "@/bindings";

export type OverlayWaveTheme = "black-white" | "black-blue" | "black-rainbow";
export type OverlayWidthPreset = "long" | "medium" | "short";

export const OVERLAY_THEME_OPTIONS: Array<{
  theme: OverlayWaveTheme;
  label: string;
  barColors: string[];
}> = [
  {
    theme: "black-white",
    label: "White on black",
    barColors: ["#e2e8f0", "#cbd5e1", "#94a3b8"],
  },
  {
    theme: "black-blue",
    label: "Blue on black",
    barColors: ["#22d3ee", "#3b82f6", "#6366f1"],
  },
  {
    theme: "black-rainbow",
    label: "Rainbow on black",
    barColors: ["#4ade80", "#facc15", "#fb923c", "#f87171"],
  },
];

export const OVERLAY_WIDTH_PRESETS: Record<
  OverlayWidthPreset,
  { barCount: number; label: string }
> = {
  long: { barCount: 24, label: "Long" },
  medium: { barCount: 18, label: "Medium" },
  short: { barCount: 12, label: "Short" },
};

export function getBarColor(
  index: number,
  total: number,
  theme: OverlayWaveTheme,
): string {
  const t = index / Math.max(1, total - 1);
  if (theme === "black-white") return "#f1f5f9";
  if (theme === "black-rainbow") {
    const hue = 140 - Math.round(t * 110);
    const lightness = 64 - Math.round(Math.abs(t - 0.5) * 12);
    return `hsl(${hue} 95% ${lightness}%)`;
  }
  const hue = 190 + Math.round(t * 30);
  const lightness = 62 - Math.round(Math.abs(t - 0.5) * 14);
  return `hsl(${hue} 90% ${lightness}%)`;
}

export function getTimerColor(theme: OverlayWaveTheme): string {
  if (theme === "black-white") return "#e5e7eb";
  if (theme === "black-rainbow") return "#fef08a";
  return "#bae6fd";
}

export const useResolvedOverlayStyle = (): Exclude<
  OverlayStyleValue,
  "auto"
> => {
  const { getSetting } = useSettings();
  const models = useModelStore((s) => s.models);
  const currentModel = useModelStore((s) => s.currentModel);
  const supportsLive =
    getSetting("stt_engine_mode") === "cloud"
      ? !!getSetting("cloud_stt_streaming")
      : (models.find((m) => m.id === currentModel)?.supports_streaming ??
        false);
  const stored = (getSetting("overlay_style") ?? "auto") as OverlayStyleValue;
  return stored === "auto" ? (supportsLive ? "live" : "minimal") : stored;
};

/** Interactive 30fps animated preview of the SayIt-style overlay capsule & typing bubble */
export const OverlayPreview: React.FC<{
  theme: OverlayWaveTheme;
  showDuration: boolean;
  barCount: number;
  streaming: boolean;
}> = ({ theme, showDuration, barCount, streaming }) => {
  const previewText = "LIVE TRANSCRIPT — Awaz listens and types as you speak";
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!streaming) {
      setTyped("");
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      if (i <= previewText.length) {
        setTyped(previewText.slice(0, i));
        i += 1;
        timer = setTimeout(step, 100);
      } else {
        timer = setTimeout(() => {
          i = 0;
          step();
        }, 1600);
      }
    };
    step();
    return () => clearTimeout(timer);
  }, [streaming, previewText]);

  useEffect(() => {
    const heights = new Array(barCount).fill(3);
    let running = true;
    let rafId = 0;
    let lastFrame = 0;
    const FRAME_INTERVAL = 1000 / 30;

    const animate = (now: number) => {
      if (!running) return;
      if (now - lastFrame >= FRAME_INTERVAL) {
        lastFrame = now;
        for (let i = 0; i < heights.length; i++) {
          const target = 3 + Math.random() * 15;
          heights[i] = heights[i] + (target - heights[i]) * 0.15;
          const el = barRefs.current[i];
          if (el) {
            const h = Math.min(18, Math.max(3, heights[i]));
            el.style.height = `${h}px`;
            el.style.opacity = String(0.7 + (h / 18) * 0.3);
          }
        }
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [barCount]);

  return (
    <div className="flex flex-col items-center gap-2.5 py-3">
      {/* SayIt Pure-Black Overlay Capsule (Transcript-first + Waveform + Timer) */}
      <div className="flex items-center rounded-full border border-zinc-700 bg-black px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.7)] gap-2.5 max-w-[90%]">
        {/* Live transcript text */}
        <div className="flex items-center min-w-[120px] max-w-[220px] overflow-hidden text-xs font-medium text-white truncate">
          {streaming ? (
            <span>
              {typed || "Listening..."}
              <span className="ml-0.5 inline-block h-[1em] w-[2px] rounded-full align-middle bg-white animate-pulse" />
            </span>
          ) : (
            <span className="text-zinc-400">Listening...</span>
          )}
        </div>

        {/* Subtle divider */}
        <span
          className="h-3.5 w-px bg-zinc-700/80 shrink-0"
          aria-hidden="true"
        />

        {/* Waveform bars */}
        <div
          className="flex items-center gap-[2.5px] shrink-0"
          style={{ height: "20px" }}
        >
          {Array.from({ length: barCount }, (_, index) => {
            const color = getBarColor(index, barCount, theme);
            return (
              <div
                key={index}
                ref={(el) => {
                  barRefs.current[index] = el;
                }}
                className="w-[2.5px] rounded-full"
                style={{
                  backgroundColor: color,
                  height: "3px",
                  opacity: 0.7,
                  transition: "height 50ms ease-out, opacity 50ms ease-out",
                }}
              />
            );
          })}
        </div>

        {/* Elapsed duration timer */}
        {showDuration && (
          <span
            className="ml-1 min-w-[28px] text-right font-mono tabular-nums text-xs font-semibold shrink-0"
            style={{ color: getTimerColor(theme) }}
          >
            3.2s
          </span>
        )}
      </div>

      <span className="text-[11px] text-muted">SayIt Overlay Preview</span>
    </div>
  );
};

export const OverlayStyle: React.FC<{
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}> = React.memo(({ grouped = false }) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const currentTheme =
    (getSetting("overlay_waveform_theme" as any) as OverlayWaveTheme) ||
    "black-rainbow";
  const currentWidth =
    (getSetting("overlay_width" as any) as OverlayWidthPreset) || "medium";
  const showDuration =
    getSetting("overlay_show_duration" as any) !== undefined
      ? Boolean(getSetting("overlay_show_duration" as any))
      : true;
  const streamingDisplay =
    getSetting("overlay_streaming_display" as any) !== undefined
      ? Boolean(getSetting("overlay_streaming_display" as any))
      : true;

  const widthPreset =
    OVERLAY_WIDTH_PRESETS[currentWidth] || OVERLAY_WIDTH_PRESETS.medium;

  return (
    <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
      <div className="border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-ink text-sm">
            {t("settings.overlay.styleTitle", {
              defaultValue: "Overlay Style & Waveform Theme",
            })}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          {t("settings.overlay.styleDesc", {
            defaultValue:
              "Customize the appearance, waveform color palette, capsule width, timer, and live captions of the recording overlay.",
          })}
        </p>
      </div>

      {/* 1. Waveform Theme Selection Cards */}
      <div>
        <label className="mb-2 block text-xs font-medium text-ink">
          {t("settings.overlay.waveformTheme", {
            defaultValue: "Waveform Theme",
          })}
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OVERLAY_THEME_OPTIONS.map((opt) => {
            const isSelected = currentTheme === opt.theme;
            return (
              <button
                key={opt.theme}
                type="button"
                onClick={() =>
                  void updateSetting("overlay_waveform_theme" as any, opt.theme)
                }
                disabled={isUpdating("overlay_waveform_theme" as any)}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-hairline bg-surface-muted hover:border-hairline-strong"
                }`}
              >
                <span className="text-xs font-medium text-ink">
                  {opt.label}
                </span>
                <span className="flex gap-1 items-center">
                  {opt.barColors.map((color, i) => (
                    <span
                      key={i}
                      className="h-3.5 w-1 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Overlay Width Preset */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div>
          <span className="text-xs font-medium text-ink">
            {t("settings.overlay.width", { defaultValue: "Overlay Width" })}
          </span>
          <p className="text-[11px] text-muted">
            {currentWidth === "long"
              ? "Long (24 bars)"
              : currentWidth === "medium"
                ? "Medium (18 bars)"
                : "Short (12 bars)"}
          </p>
        </div>
        <Segmented
          label="Overlay Width"
          value={currentWidth}
          options={[
            { value: "long", label: "Long" },
            { value: "medium", label: "Medium" },
            { value: "short", label: "Short" },
          ]}
          onChange={(val) =>
            void updateSetting(
              "overlay_width" as any,
              val as OverlayWidthPreset,
            )
          }
          disabled={isUpdating("overlay_width" as any)}
          size="sm"
        />
      </div>

      {/* 3. Show Elapsed Time Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-hairline">
        <div>
          <span className="text-xs font-medium text-ink">
            {t("settings.overlay.showDuration", {
              defaultValue: "Show Elapsed Time",
            })}
          </span>
          <p className="text-[11px] text-muted">
            Display live recording duration timer on the overlay capsule.
          </p>
        </div>
        <Switch
          checked={showDuration}
          onChange={(checked) =>
            void updateSetting("overlay_show_duration" as any, checked)
          }
          disabled={isUpdating("overlay_show_duration" as any)}
          label="Show elapsed time"
        />
      </div>

      {/* 4. Live Captions Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-hairline">
        <div>
          <span className="text-xs font-medium text-ink">
            {t("settings.overlay.liveCaptions", {
              defaultValue: "Live Captions",
            })}
          </span>
          <p className="text-[11px] text-muted">
            Shows the transcript on the overlay while you speak.
          </p>
        </div>
        <Switch
          checked={streamingDisplay}
          onChange={(checked) =>
            void updateSetting("overlay_streaming_display" as any, checked)
          }
          disabled={isUpdating("overlay_streaming_display" as any)}
          label="Live captions"
        />
      </div>

      {/* 5. Live Interactive Overlay Preview */}
      <div className="mt-2 rounded-xl border border-hairline bg-surface-muted/50 p-4">
        <OverlayPreview
          theme={currentTheme}
          showDuration={showDuration}
          barCount={widthPreset.barCount}
          streaming={streamingDisplay}
        />
      </div>
    </div>
  );
});
