import React from "react";
import { useTranslation } from "react-i18next";
import { AudioLines } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { SettingContainer } from "@/components/ui/SettingContainer";
import { useSettings } from "@/hooks/useSettings";

export const WaveformCustomizer: React.FC<{ grouped?: boolean }> = ({
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const currentStyle =
    (getSetting("waveform_style" as any) as string) || "bars";

  const options = [
    {
      value: "bars",
      label: t("settings.waveform.bars", { defaultValue: "Frequency Bars" }),
    },
    {
      value: "smooth",
      label: t("settings.waveform.smooth", { defaultValue: "Smooth Wave" }),
    },
    {
      value: "dots",
      label: t("settings.waveform.dots", { defaultValue: "Minimal Dots" }),
    },
  ];

  return (
    <SettingContainer
      title={t("settings.waveform.title", {
        defaultValue: "Audio Waveform Style",
      })}
      description={t("settings.waveform.desc", {
        defaultValue:
          "Visual animation style displayed inside the floating overlay during audio recording.",
      })}
      icon={AudioLines}
      tone="sky"
      grouped={grouped}
    >
      <Dropdown
        options={options}
        selectedValue={currentStyle}
        onSelect={(value) => void updateSetting("waveform_style" as any, value)}
        disabled={isUpdating("waveform_style" as any)}
      />
    </SettingContainer>
  );
};
