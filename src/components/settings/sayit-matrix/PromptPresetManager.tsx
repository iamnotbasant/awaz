import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Check, AppWindow, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import Badge from "@/components/ui/Badge";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";

export const PromptPresetManager: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, refreshSettings } = useSettings();
  const prompts = getSetting("post_process_prompts") || [];
  const selectedPromptId = getSetting("post_process_selected_prompt_id") || "hinglish_roman";

  const [appRules, setAppRules] = useState<Record<string, string>>({});
  const [newAppName, setNewAppName] = useState("");
  const [newAppPresetId, setNewAppPresetId] = useState("hinglish_roman");
  const [isAddingRule, setIsAddingRule] = useState(false);

  // Load app prompt rules
  const loadRules = async () => {
    try {
      const res = await commands.getAppPromptRules();
      if (res.status === "ok") {
        setAppRules(res.data);
      }
    } catch (err) {
      console.warn("Failed to load app prompt rules:", err);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const handleSelectPreset = async (id: string) => {
    try {
      const res = await commands.setPostProcessSelectedPrompt(id);
      if (res.status === "ok") {
        await refreshSettings();
        toast.success(t("settings.presets.switched", { defaultValue: "Switched cleanup preset" }));
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleAddRule = async () => {
    const cleanApp = newAppName.trim();
    if (!cleanApp) return;

    setIsAddingRule(true);
    try {
      const res = await commands.setAppPromptRule(cleanApp, newAppPresetId);
      if (res.status === "ok") {
        toast.success(t("settings.presets.ruleAdded", { defaultValue: `Rule added for ${cleanApp}` }));
        setNewAppName("");
        await loadRules();
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsAddingRule(false);
    }
  };

  const handleRemoveRule = async (appName: string) => {
    try {
      const res = await commands.removeAppPromptRule(appName);
      if (res.status === "ok") {
        await loadRules();
        toast.success(t("settings.presets.ruleRemoved", { defaultValue: `Removed rule for ${appName}` }));
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const presetDropdownOptions = prompts.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="space-y-6">
      {/* Presets List */}
      <div className="space-y-3 rounded-2xl border border-hairline bg-surface p-5 elev-card">
        <div className="flex items-center gap-2 border-b border-hairline pb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-ink text-sm">
            {t("settings.presets.title", { defaultValue: "AI Cleanup Presets" })}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {prompts.map((preset) => {
            const isSelected = preset.id === selectedPromptId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => void handleSelectPreset(preset.id)}
                className={`flex items-start justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-hairline bg-surface-muted hover:border-hairline-strong"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-ink truncate">{preset.name}</span>
                    {preset.id === "hinglish_roman" && (
                      <Badge variant="active" className="text-[10px] py-0 px-1.5">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {preset.prompt.slice(0, 100)}...
                  </p>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-App Rules */}
      <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
        <div className="border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <AppWindow className="h-4 w-4 text-accent" />
            <h3 className="font-semibold text-ink text-sm">
              {t("settings.presets.appRulesTitle", { defaultValue: "Per-Application Rules" })}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            {t("settings.presets.appRulesDesc", {
              defaultValue:
                "Automatically apply a specific cleanup preset based on the focused window (e.g. Code.exe -> Formal English, WhatsApp.exe -> Hinglish Roman).",
            })}
          </p>
        </div>

        {/* Existing Rules */}
        <div className="space-y-2">
          {Object.keys(appRules).length === 0 ? (
            <p className="py-2 text-xs text-muted">
              {t("settings.presets.noRules", { defaultValue: "No application rules configured yet." })}
            </p>
          ) : (
            Object.entries(appRules).map(([appName, rulePresetId]) => {
              const matchedPreset = prompts.find((p) => p.id === rulePresetId);
              return (
                <div
                  key={appName}
                  className="flex items-center justify-between rounded-lg border border-hairline bg-surface-muted px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">{appName}</span>
                    <span className="text-muted">➔</span>
                    <span className="text-xs text-muted-soft">
                      {matchedPreset?.name ?? rulePresetId}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemoveRule(appName)}
                    className="h-6 w-6 p-0 text-muted hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Add Rule Form */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline">
          <Input
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            placeholder={t("settings.presets.appPlaceholder", {
              defaultValue: "Process name (e.g. Code.exe)",
            })}
            variant="compact"
            className="min-w-[180px] flex-1 text-xs"
          />
          <div className="min-w-[160px]">
            <Dropdown
              options={presetDropdownOptions}
              selectedValue={newAppPresetId}
              onSelect={(val) => setNewAppPresetId(val)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => void handleAddRule()}
            disabled={!newAppName.trim() || isAddingRule}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("settings.presets.addRule", { defaultValue: "Add Rule" })}
          </Button>
        </div>
      </div>
    </div>
  );
};
