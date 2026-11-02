/* eslint-disable i18next/no-literal-string */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Pencil, Check, AppWindow, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { Segmented } from "@/components/ui/Segmented";
import { Dialog } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import Badge from "@/components/ui/Badge";
import { useSettings } from "@/hooks/useSettings";
import { commands, type AppPromptRule } from "@/bindings";

export interface PresetDefinition {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn: string;
  descZh: string;
  builtin: boolean;
  isDefault?: boolean;
}

export const BUILTIN_PRESET_METADATA: PresetDefinition[] = [
  {
    id: "intent",
    nameEn: "Intent cleanup",
    nameZh: "意图整理",
    descEn:
      "Removes fillers and repetition, and turns speech into clear, concise writing",
    descZh: "去除口语填充词和冗余重复，转为逻辑清晰的精炼文字",
    builtin: true,
  },
  {
    id: "faithful",
    nameEn: "Faithful cleanup",
    nameZh: "忠实校对",
    descEn:
      "Fixes misheard words, formatting, and terms while keeping your wording and order",
    descZh: "修正错别字、标点与专业词汇，严格保留原句式与表达习惯",
    builtin: true,
  },
  {
    id: "zh2en",
    nameEn: "Chinese to English",
    nameZh: "中翻英忠实校对",
    descEn:
      "Speak Chinese; fixes recognition errors, then translates faithfully into English",
    descZh: "口述中文自动纠错并地道翻译为专业英文",
    builtin: true,
  },
  {
    id: "casual",
    nameEn: "Conversational cleanup",
    nameZh: "口语化整理",
    descEn:
      "Keeps your spoken tone with a light touch; good for instructing AI assistants",
    descZh: "保留口语化语气并微调顺句，适合直接指挥 AI 编程助手",
    builtin: true,
  },
  {
    id: "hinglish_roman",
    nameEn: "Hinglish Roman",
    nameZh: "印英语音转罗马字",
    descEn:
      "Default Roman Hinglish preset for Indian English, Hindi, and code-mixed dictation",
    descZh: "适用于印式英语、印地语和混语听写的默认罗马字模式",
    builtin: true,
    isDefault: true,
  },
];

const BUILTIN_IDS = new Set(BUILTIN_PRESET_METADATA.map((p) => p.id));

export const PromptPresetManager: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, refreshSettings } = useSettings();
  const prompts = getSetting("post_process_prompts") || [];
  const selectedPromptId =
    getSetting("post_process_selected_prompt_id") || "hinglish_roman";

  // Tab for preset language display
  const [tabLanguage, setTabLanguage] = useState<"en" | "zh">("en");

  // Custom preset dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetDraftName, setPresetDraftName] = useState("");
  const [presetDraftPrompt, setPresetDraftPrompt] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Rich App rules state (P5)
  const [richRules, setRichRules] = useState<AppPromptRule[]>([]);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDraftName, setRuleDraftName] = useState("");
  const [ruleDraftProcesses, setRuleDraftProcesses] = useState("");
  const [ruleDraftPresetId, setRuleDraftPresetId] = useState("intent");
  const [ruleDraftPromptAppend, setRuleDraftPromptAppend] = useState("");
  const [isSavingRule, setIsSavingRule] = useState(false);

  const loadRules = async () => {
    try {
      const res = await commands.getRichAppRules();
      if (res.status === "ok") {
        setRichRules(res.data);
      }
    } catch (err) {
      console.warn("Failed to load rich app rules:", err);
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
        toast.success(
          t("settings.presets.switched", {
            defaultValue: "Switched cleanup preset",
          }),
        );
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const openNewPresetDialog = () => {
    setEditingPresetId(null);
    setPresetDraftName("");
    setPresetDraftPrompt("");
    setSelectedTemplateId("");
    setIsDialogOpen(true);
  };

  const openEditPresetDialog = (
    id: string,
    name: string,
    promptText: string,
  ) => {
    setEditingPresetId(id);
    setPresetDraftName(name);
    setPresetDraftPrompt(promptText);
    setSelectedTemplateId("");
    setIsDialogOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const found = prompts.find((p) => p.id === templateId);
    if (found) {
      setPresetDraftPrompt(found.prompt);
      if (!presetDraftName) {
        setPresetDraftName(`${found.name} (Copy)`);
      }
    }
  };

  const handleSavePreset = async () => {
    const cleanName = presetDraftName.trim();
    const cleanPrompt = presetDraftPrompt.trim();
    if (!cleanName || !cleanPrompt) return;

    setIsSaving(true);
    try {
      if (editingPresetId) {
        const res = await commands.updatePostProcessPrompt(
          editingPresetId,
          cleanName,
          cleanPrompt,
        );
        if (res.status === "ok") {
          toast.success(
            t("settings.presets.updated", {
              defaultValue: "Updated preset",
            }),
          );
        }
      } else {
        const res = await commands.addPostProcessPrompt(cleanName, cleanPrompt);
        if (res.status === "ok") {
          await commands.setPostProcessSelectedPrompt(res.data.id);
          toast.success(
            t("settings.presets.created", {
              defaultValue: "Created and selected new preset",
            }),
          );
        }
      }
      await refreshSettings();
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      const res = await commands.deletePostProcessPrompt(id);
      if (res.status === "ok") {
        await refreshSettings();
        toast.success(
          t("settings.presets.deleted", {
            defaultValue: "Deleted custom preset",
          }),
        );
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Rule management functions (P5)
  const openNewRuleDialog = () => {
    setEditingRuleId(null);
    setRuleDraftName("");
    setRuleDraftProcesses("");
    setRuleDraftPresetId("intent");
    setRuleDraftPromptAppend("");
    setIsRuleDialogOpen(true);
  };

  const openEditRuleDialog = (rule: AppPromptRule) => {
    setEditingRuleId(rule.id);
    setRuleDraftName(rule.name);
    setRuleDraftProcesses(rule.processNames.join(", "));
    setRuleDraftPresetId(rule.presetId);
    setRuleDraftPromptAppend(rule.promptAppend);
    setIsRuleDialogOpen(true);
  };

  const handleToggleRule = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await commands.toggleRichAppRule(id, !currentEnabled);
      if (res.status === "ok") {
        await loadRules();
        toast.success(
          !currentEnabled
            ? "Application rule enabled"
            : "Application rule disabled",
        );
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleSaveRule = async () => {
    const cleanName = ruleDraftName.trim();
    const cleanProcesses = ruleDraftProcesses
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (!cleanName || cleanProcesses.length === 0) return;

    setIsSavingRule(true);
    try {
      const existing = richRules.find((r) => r.id === editingRuleId);
      const ruleToSave: AppPromptRule = {
        id: editingRuleId || `custom_${Date.now()}`,
        name: cleanName,
        processNames: cleanProcesses,
        presetId: ruleDraftPresetId,
        promptAppend: ruleDraftPromptAppend.trim(),
        enabled: existing ? existing.enabled : true,
        builtin: existing ? existing.builtin : false,
      };

      const res = await commands.saveRichAppRule(ruleToSave);
      if (res.status === "ok") {
        toast.success(editingRuleId ? "Rule updated" : "Rule created");
        await loadRules();
        setIsRuleDialogOpen(false);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await commands.deleteRichAppRule(id);
      if (res.status === "ok") {
        await loadRules();
        toast.success("Rule deleted");
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Build the list of presets to display:
  const customPrompts = prompts.filter((p) => !BUILTIN_IDS.has(p.id));

  const templateOptions = [
    {
      value: "",
      label: t("settings.presets.scratch", {
        defaultValue: "Start from scratch",
      }),
    },
    ...prompts.map((p) => ({ value: p.id, label: p.name })),
  ];

  const presetDropdownOptions = [
    { value: "intent", label: "Intent cleanup" },
    { value: "faithful", label: "Faithful cleanup" },
    { value: "zh2en", label: "Chinese to English" },
    { value: "casual", label: "Conversational cleanup" },
    { value: "hinglish_roman", label: "Hinglish Roman" },
    ...customPrompts.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Presets Card */}
      <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
        {/* Header with Title, Language Tabs, and + New button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="font-semibold text-ink text-sm">
              {t("settings.presets.title", {
                defaultValue: "AI Cleanup Presets",
              })}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Segmented
              label="Preset Language"
              value={tabLanguage}
              onChange={(val) => setTabLanguage(val as "en" | "zh")}
              options={[
                { value: "en", label: "English" },
                { value: "zh", label: "Chinese" },
              ]}
              size="sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={openNewPresetDialog}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("settings.presets.new", { defaultValue: "+ New" })}
            </Button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* 1. Built-in presets */}
          {BUILTIN_PRESET_METADATA.map((meta) => {
            const isSelected = selectedPromptId === meta.id;
            const displayName =
              tabLanguage === "zh" ? meta.nameZh : meta.nameEn;
            const displayDesc =
              tabLanguage === "zh" ? meta.descZh : meta.descEn;

            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => void handleSelectPreset(meta.id)}
                className={`flex items-start justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-hairline bg-surface-muted hover:border-hairline-strong"
                }`}
              >
                <div className="min-w-0 pr-2 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm text-ink">
                      {displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5"
                    >
                      Built in
                    </Badge>
                    {meta.isDefault && (
                      <Badge
                        variant="active"
                        className="text-[10px] py-0 px-1.5"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                    {displayDesc}
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

          {/* 2. Custom presets */}
          {customPrompts.map((custom) => {
            const isSelected = selectedPromptId === custom.id;
            return (
              <div
                key={custom.id}
                onClick={() => void handleSelectPreset(custom.id)}
                className={`flex items-start justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-hairline bg-surface-muted hover:border-hairline-strong"
                }`}
              >
                <div className="min-w-0 pr-2 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm text-ink truncate">
                      {custom.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5"
                    >
                      Custom
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted line-clamp-2">
                    {custom.prompt.slice(0, 100)}...
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted hover:text-ink"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPresetDialog(
                        custom.id,
                        custom.name,
                        custom.prompt,
                      );
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted hover:text-error"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeletePreset(custom.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white ml-1">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Preset Create/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={
          editingPresetId
            ? t("settings.presets.editTitle", { defaultValue: "Edit Preset" })
            : t("settings.presets.createTitle", {
                defaultValue: "New Cleanup Preset",
              })
        }
        description={t("settings.presets.dialogDesc", {
          defaultValue:
            "Define custom system prompts and instructions for speech-to-text cleanup.",
        })}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              {t("settings.presets.presetName", {
                defaultValue: "Preset Name",
              })}
            </label>
            <Input
              value={presetDraftName}
              onChange={(e) => setPresetDraftName(e.target.value)}
              placeholder="e.g. Meeting Notes, Code Instruction, Formal Email"
              className="text-xs"
            />
          </div>

          {!editingPresetId && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink">
                {t("settings.presets.startFrom", {
                  defaultValue: "Start from an existing preset (optional)",
                })}
              </label>
              <Dropdown
                options={templateOptions}
                selectedValue={selectedTemplateId}
                onSelect={handleTemplateSelect}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              {t("settings.presets.systemPrompt", {
                defaultValue: "System Prompt Instructions",
              })}
            </label>
            <Textarea
              value={presetDraftPrompt}
              onChange={(e) => setPresetDraftPrompt(e.target.value)}
              rows={8}
              placeholder="Write the exact LLM prompt instructions here..."
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSavePreset()}
              disabled={
                !presetDraftName.trim() || !presetDraftPrompt.trim() || isSaving
              }
            >
              {editingPresetId
                ? t("common.save", { defaultValue: "Save" })
                : t("settings.presets.create", {
                    defaultValue: "Create Preset",
                  })}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* P5: Per-App Rules Section */}
      <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <AppWindow className="h-4 w-4 text-accent" />
            <div>
              <h3 className="font-semibold text-ink text-sm">
                {t("settings.presets.appRulesTitle", {
                  defaultValue: "Per-Application Rules",
                })}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {t("settings.presets.appRulesDesc", {
                  defaultValue:
                    "Switch presets or add prompt instructions based on the active app's process.",
                })}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={openNewRuleDialog}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("settings.presets.newRule", { defaultValue: "+ New rule" })}
          </Button>
        </div>

        {/* Rules List */}
        <div className="space-y-2.5">
          {richRules.length === 0 ? (
            <p className="py-2 text-xs text-muted">
              {t("settings.presets.noRules", {
                defaultValue: "No application rules configured yet.",
              })}
            </p>
          ) : (
            richRules.map((rule) => {
              const matchedPreset =
                prompts.find((p) => p.id === rule.presetId) ||
                BUILTIN_PRESET_METADATA.find((p) => p.id === rule.presetId);

              return (
                <div
                  key={rule.id}
                  className="rounded-xl border border-hairline bg-surface-muted p-3.5 text-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-semibold text-xs text-ink">
                        {rule.name}
                      </span>
                      <Badge
                        variant={rule.builtin ? "secondary" : "outline"}
                        className="text-[10px] py-0 px-1.5"
                      >
                        {rule.builtin ? "Built in" : "Custom"}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted bg-surface px-1.5 py-0.5 rounded border border-hairline">
                        {rule.processNames.join(", ")}
                      </span>
                      <span className="text-xs text-accent font-medium">
                        ➔{" "}
                        {matchedPreset
                          ? "name" in matchedPreset
                            ? matchedPreset.name
                            : matchedPreset.nameEn
                          : rule.presetId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!rule.builtin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted hover:text-ink"
                            onClick={() => openEditRuleDialog(rule)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted hover:text-error"
                            onClick={() => void handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Switch
                        checked={rule.enabled}
                        onChange={() =>
                          void handleToggleRule(rule.id, rule.enabled)
                        }
                        label={`Toggle rule ${rule.name}`}
                      />
                    </div>
                  </div>

                  {rule.promptAppend && (
                    <p className="mt-1.5 text-xs text-muted-soft line-clamp-1 italic">
                      "{rule.promptAppend}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* P5: Create/Edit Rule Dialog */}
      <Dialog
        open={isRuleDialogOpen}
        onClose={() => setIsRuleDialogOpen(false)}
        title={
          editingRuleId
            ? t("settings.presets.editRuleTitle", {
                defaultValue: "Edit Application Rule",
              })
            : t("settings.presets.createRuleTitle", {
                defaultValue: "New Application Rule",
              })
        }
        description={t("settings.presets.ruleDialogDesc", {
          defaultValue:
            "Map active window executable processes to specific cleanup presets and instructions.",
        })}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              Rule Name
            </label>
            <Input
              value={ruleDraftName}
              onChange={(e) => setRuleDraftName(e.target.value)}
              placeholder="e.g. VS Code, Slack, WhatsApp"
              className="text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              Process Names (comma-separated)
            </label>
            <Input
              value={ruleDraftProcesses}
              onChange={(e) => setRuleDraftProcesses(e.target.value)}
              placeholder="e.g. code.exe, Code.exe, code-insiders.exe"
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              Preset Override
            </label>
            <Dropdown
              options={presetDropdownOptions}
              selectedValue={ruleDraftPresetId}
              onSelect={(val) => setRuleDraftPresetId(val)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              Additional Prompt Instructions (Optional)
            </label>
            <Textarea
              value={ruleDraftPromptAppend}
              onChange={(e) => setRuleDraftPromptAppend(e.target.value)}
              rows={4}
              placeholder="e.g. Keep code formatting intact, output concise chat messages, etc."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRuleDialogOpen(false)}
              disabled={isSavingRule}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveRule()}
              disabled={
                !ruleDraftName.trim() ||
                !ruleDraftProcesses.trim() ||
                isSavingRule
              }
            >
              {editingRuleId ? "Save Rule" : "Create Rule"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
