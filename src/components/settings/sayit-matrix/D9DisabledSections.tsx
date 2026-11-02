/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useTranslation } from "react-i18next";
import { Server, CloudUpload, Lock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { SettingContainer } from "@/components/ui/SettingContainer";

export const ServerModeSection: React.FC<{ grouped?: boolean }> = ({
  grouped = false,
}) => {
  const { t } = useTranslation();

  return (
    <SettingContainer
      title={t("settings.serverMode.title", {
        defaultValue: "Server Mode (Self-Hosted Backend)",
      })}
      description={t("settings.serverMode.desc", {
        defaultValue:
          "Server Mode allows connecting directly to a self-hosted or corporate Awaz server. This mode is planned for a future update; Cloud API Mode and Local Mode are active.",
      })}
      icon={Server}
      tone="indigo"
      grouped={grouped}
    >
      <div className="flex items-center gap-2">
        <Badge variant="warning">
          {t("common.plannedInVersion", { defaultValue: "Planned in 0.0.1" })}
        </Badge>
        <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
          <input
            type="text"
            disabled
            value="ws://localhost:8000/ws"
            className="h-8 rounded-lg border border-hairline bg-surface-muted px-2.5 text-xs text-muted cursor-not-allowed"
            readOnly
          />
          <div className="flex items-center gap-1 text-xs text-muted">
            <Lock className="h-3.5 w-3.5" />
            <span>Disabled</span>
          </div>
        </div>
      </div>
    </SettingContainer>
  );
};

export const WebDavSection: React.FC<{ grouped?: boolean }> = ({
  grouped = false,
}) => {
  const { t } = useTranslation();

  return (
    <SettingContainer
      title={t("settings.webdav.title", {
        defaultValue: "WebDAV Cloud Sync & Backup",
      })}
      description={t("settings.webdav.desc", {
        defaultValue:
          "Synchronize settings, custom presets, and vocabulary across devices using your own WebDAV server. This feature is planned for a future update.",
      })}
      icon={CloudUpload}
      tone="indigo"
      grouped={grouped}
    >
      <div className="flex items-center gap-2">
        <Badge variant="warning">
          {t("common.plannedInVersion", { defaultValue: "Planned in 0.0.1" })}
        </Badge>
        <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
          <input
            type="text"
            disabled
            value="https://webdav.example.com"
            className="h-8 rounded-lg border border-hairline bg-surface-muted px-2.5 text-xs text-muted cursor-not-allowed"
            readOnly
          />
          <div className="flex items-center gap-1 text-xs text-muted">
            <Lock className="h-3.5 w-3.5" />
            <span>Disabled</span>
          </div>
        </div>
      </div>
    </SettingContainer>
  );
};
