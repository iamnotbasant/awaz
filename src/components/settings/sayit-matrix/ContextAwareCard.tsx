import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { Dropdown } from "@/components/ui/Dropdown";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";

export const ContextAwareCard: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const enabled = getSetting("context_awareness_enabled") ?? true;
  const currentModel = getSetting("context_selection_model") ?? "";

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const loadPrompt = async () => {
    try {
      const res = await commands.getSelectionEditPrompt();
      if (res.status === "ok") {
        setPromptText(res.data);
      }
    } catch (e) {
      console.warn("Failed to load selection edit prompt:", e);
    }
  };

  useEffect(() => {
    void loadPrompt();
  }, []);

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await commands.updateSelectionEditPrompt(promptText);
      if (res.status === "ok") {
        toast.success(
          t("settings.contextAware.promptSaved", {
            defaultValue: "Selection-edit prompt saved",
          }),
        );
        setPromptOpen(false);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleResetPrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await commands.resetSelectionEditPrompt();
      if (res.status === "ok") {
        setPromptText(res.data);
        toast.success(
          t("settings.contextAware.promptReset", {
            defaultValue: "Restored shipped Prompt B verbatim",
          }),
        );
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSavingPrompt(false);
    }
  };

  const modelOptions = [
    {
      value: "",
      label: t("settings.contextAware.currentModel", {
        defaultValue: "Current AI service",
      }),
    },
    {
      value: "openai/gpt-oss-20b",
      label: "Groq (openai/gpt-oss-20b)",
    },
    {
      value: "gemini-3-flash-preview",
      label: "Gemini 3 Flash Preview",
    },
    {
      value: "builtin",
      label: "Built-in Local LLM",
    },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="font-semibold text-ink text-sm">
              {t("settings.contextAware.title", {
                defaultValue: "Context awareness",
              })}
            </h3>
          </div>
          <p className="text-xs text-muted">
            {t("settings.contextAware.desc", {
              defaultValue:
                "Read text selection to execute voice editing instructions and replace selected text.",
            })}
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                void loadPrompt();
                setPromptOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              <Pencil className="h-3 w-3" />
              {t("settings.contextAware.viewEditPrompt", {
                defaultValue: "View and edit prompt",
              })}
            </button>
          </div>
        </div>
        <Switch
          checked={enabled}
          onChange={(val) => void updateSetting("context_awareness_enabled", val)}
          disabled={isUpdating("context_awareness_enabled")}
          label={t("settings.contextAware.toggle", {
            defaultValue: "Context awareness",
          })}
        />
      </div>

      {enabled && (
        <div className="pt-3 border-t border-hairline flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink">
              {t("settings.contextAware.modelLabel", {
                defaultValue: "Model for selection edits:",
              })}
            </p>
            <p className="text-[11px] text-muted">
              {t("settings.contextAware.modelDesc", {
                defaultValue:
                  "Defaults to your current active AI service for instant editing.",
              })}
            </p>
          </div>
          <div className="min-w-[200px]">
            <Dropdown
              options={modelOptions}
              selectedValue={currentModel}
              onSelect={(val) => void updateSetting("context_selection_model", val)}
            />
          </div>
        </div>
      )}

      {/* View & Edit Prompt Modal */}
      <Dialog
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        size="lg"
        title={t("settings.contextAware.promptTitle", {
          defaultValue: "Selection-edit Prompt (Context Awareness)",
        })}
        description={t("settings.contextAware.promptSubtitle", {
          defaultValue:
            "Instructs the AI how to edit the highlighted text according to your spoken words (Prompt B).",
        })}
      >
        <div className="space-y-4">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-hairline bg-surface-muted p-3 text-xs font-mono text-ink focus:border-accent focus:outline-none"
            spellCheck={false}
          />
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleResetPrompt()}
              disabled={savingPrompt}
              className="gap-1.5 text-xs text-muted hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("settings.contextAware.resetDefault", {
                defaultValue: "Reset to default Prompt B",
              })}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPromptOpen(false)}
                disabled={savingPrompt}
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSavePrompt()}
                disabled={savingPrompt || !promptText.trim()}
              >
                {t("common.save", { defaultValue: "Save" })}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
