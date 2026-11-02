import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/hooks/useSettings";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/InfoTip";
import { CloudTranscriptionGroup } from "@/components/settings/dictation/CloudTranscriptionGroup";
import { LlmCatalog } from "@/components/settings/assistant/LlmCatalog";
import { PostProcessingSettingsApi } from "@/components/settings/post-processing/PostProcessingSettings";
import { PostProcessTimeout } from "@/components/settings/PostProcessTimeout";
import { ThinkingLevelSetting } from "@/components/settings/ThinkingLevelSetting";
import { PostProcessUnloadTimeout } from "@/components/settings/PostProcessUnloadTimeout";
import { AssistantSettings } from "@/components/settings/assistant/AssistantSettings";
import { useNavigation, type ModelSlot } from "@/components/shell/navigation";
import { useModelSlots } from "@/components/shell/useModelSlots";

/**
 * The content of each Models tab.
 *
 * Every tab has the same skeleton, whichever way the job runs: a settings card
 * whose first row is "Runs on" and whose second is "Model", then — for models
 * that run on this computer — the list to download more from. Switching a job
 * between this computer and the cloud changes the rows inside the card, not the
 * shape of the page, which is what used to make the switch feel like landing on
 * a different screen.
 */

const scrollIntoView = (element: HTMLElement | null) =>
  element?.scrollIntoView({ behavior: "smooth", block: "start" });

/** A plain line of context above a tab's first card, or nothing. */
const Note: React.FC<{
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ children, action }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-hairline bg-surface-muted px-5 py-3">
    <p className="min-w-0 flex-1 text-sm text-body">{children}</p>
    {action}
  </div>
);

/** Heading for the download list on a tab. */
const CatalogHeading: React.FC<{ title: string; info?: string }> = ({
  title,
  info,
}) => (
  <div className="mb-3 flex items-center gap-1.5">
    <h3 className="font-display text-[1.375rem] text-ink">{title}</h3>
    {info && <InfoTip text={info} className="mt-0.5" />}
  </div>
);

/* ─────────────────────────── speech to text ─────────────────────────── */

export const SpeechTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-9">
      <CloudTranscriptionGroup embedded section="setup" />

      <SettingsGroup title={t("models.options")}>
        <CloudTranscriptionGroup embedded section="options" />
      </SettingsGroup>
    </div>
  );
};

/* ────────────────────────────── AI cleanup ────────────────────────────── */

export const CleanupTab: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const summary = useModelSlots().cleanup;
  const catalogRef = useRef<HTMLElement>(null);
  const enabled = getSetting("post_process_enabled") ?? false;
  const isDevice = (getSetting("post_process_provider_id") ?? "") === "builtin";

  return (
    <div className="space-y-9">
      {!enabled && (
        <Note
          action={
            <Button
              size="sm"
              onClick={() => void updateSetting("post_process_enabled", true)}
              disabled={isUpdating("post_process_enabled")}
            >
              {t("modelsHub.slots.cleanup.turnOn")}
            </Button>
          }
        >
          {t("models.cleanupOff")}
        </Note>
      )}
      {summary.borrowsAssistant && (
        <Note>
          {t("modelsHub.slots.cleanup.borrowsNotice", {
            model: summary.modelLabel ?? "",
          })}
        </Note>
      )}

      <SettingsGroup>
        <PostProcessingSettingsApi
          onBrowseModels={() => scrollIntoView(catalogRef.current)}
        />
      </SettingsGroup>

      {isDevice && (
        <section ref={catalogRef} className="scroll-mt-6">
          <CatalogHeading title={t("models.downloadTitle")} />
          <LlmCatalog role="cleanup" />
        </section>
      )}

      <SettingsGroup title={t("modelsHub.performance")}>
        {!isDevice && (
          <ThinkingLevelSetting
            job="cleanup"
            providerId={getSetting("post_process_provider_id")}
            grouped={true}
          />
        )}
        <PostProcessTimeout grouped={true} />
        {isDevice && <PostProcessUnloadTimeout grouped={true} />}
      </SettingsGroup>
    </div>
  );
};

/* ────────────────────────────── assistant ────────────────────────────── */

export const AssistantTab: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const { navigate } = useNavigation();
  const catalogRef = useRef<HTMLElement>(null);
  const assistantEnabled = getSetting("assistant_enabled") ?? false;
  const isDevice = (getSetting("assistant_provider_id") ?? "") === "builtin";

  return (
    <div className="space-y-9">
      {!assistantEnabled && (
        <Note
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("assistant")}
            >
              {t("modelsHub.slots.assistant.openAssistant")}
            </Button>
          }
        >
          {t("models.assistantOff")}
        </Note>
      )}

      <AssistantSettings
        sections={["brain"]}
        onOpenLlmCatalog={() => scrollIntoView(catalogRef.current)}
      />

      {isDevice && (
        <section ref={catalogRef} className="scroll-mt-6">
          <CatalogHeading
            title={t("models.downloadTitle")}
            info={t("modelsHub.slots.assistant.fallbackNote")}
          />
          <LlmCatalog role="assistant" />
        </section>
      )}
    </div>
  );
};

/* ──────────────────────────────── voice ──────────────────────────────── */

export const VoiceTab: React.FC = () => (
  <AssistantSettings sections={["voice"]} />
);

export const MODEL_TABS: Record<ModelSlot, React.ComponentType> = {
  stt: SpeechTab,
  cleanup: CleanupTab,
  assistant: AssistantTab,
  voice: VoiceTab,
};
