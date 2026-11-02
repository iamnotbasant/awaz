import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CloudTranscriptionGroup } from "@/components/settings/dictation/CloudTranscriptionGroup";
import { OnboardingFrame, StepHeading } from "./OnboardingFrame";

/**
 * One decision: the Gemini API key. Awaz transcribes in the cloud with
 * gemini-3.5-transcribe — there is no speech model to download, so the old
 * model-picker step is gone. The provider, key, and model rows are the same
 * `CloudTranscriptionGroup` the Models page uses, so setup and Settings
 * cannot disagree.
 */
export function SetupStep({
  onContinue,
}: {
  onContinue: (result: { skippedModels: boolean }) => void;
}) {
  const { t } = useTranslation();

  return (
    <OnboardingFrame
      step="setup"
      footer={
        <div className="ms-auto">
          <Button
            size="lg"
            onClick={() => onContinue({ skippedModels: false })}
          >
            {t("onboarding.cloudSetup.continue")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <StepHeading
        title={t("onboarding.cloudSetup.title")}
        body={t("onboarding.cloudSetup.body")}
      />

      <div className="ob-gap">
        <CloudTranscriptionGroup embedded section="setup" />
      </div>

      <p className="mt-6 px-1 text-[0.8125rem] text-muted">
        {t("onboarding.cloudSetup.anytime")}
      </p>
    </OnboardingFrame>
  );
}
