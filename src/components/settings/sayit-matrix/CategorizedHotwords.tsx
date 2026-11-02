import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Tag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";

const CATEGORIES = ["Names", "Tech", "Places"] as const;
type Category = (typeof CATEGORIES)[number];

export const CategorizedHotwords: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const [activeCategory, setActiveCategory] = useState<Category>("Names");
  const [newWord, setNewWord] = useState("");
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string[]>>({
    Names: [],
    Tech: [],
    Places: [],
  });

  const sendHotwordsToAi = getSetting("send_hotwords_to_prompt") ?? false;

  const loadCategories = async () => {
    try {
      const res = await commands.getHotwordCategories();
      if (res.status === "ok") {
        setCategoriesMap((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (err) {
      console.warn("Failed to load hotword categories:", err);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleAddWord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const word = newWord.trim().replace(/[<>"']/g, "");
    if (!word || word.length > 50) return;

    const currentWords = categoriesMap[activeCategory] || [];
    if (currentWords.some((w) => w.toLowerCase() === word.toLowerCase())) {
      toast.error(
        t("settings.hotwords.duplicate", {
          defaultValue: `"${word}" already exists in ${activeCategory}`,
        }),
      );
      return;
    }

    const updated = [...currentWords, word];
    try {
      const res = await commands.setHotwordCategory(activeCategory, updated);
      if (res.status === "ok") {
        setCategoriesMap((prev) => ({ ...prev, [activeCategory]: updated }));
        setNewWord("");
        toast.success(
          t("settings.hotwords.added", {
            defaultValue: `Added "${word}" to ${activeCategory}`,
          }),
        );
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleRemoveWord = async (wordToRemove: string) => {
    const currentWords = categoriesMap[activeCategory] || [];
    const updated = currentWords.filter((w) => w !== wordToRemove);
    try {
      const res = await commands.setHotwordCategory(activeCategory, updated);
      if (res.status === "ok") {
        setCategoriesMap((prev) => ({ ...prev, [activeCategory]: updated }));
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const words = categoriesMap[activeCategory] || [];

  return (
    <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-5 elev-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" />
            <h3 className="font-semibold text-ink text-sm">
              {t("settings.hotwords.title", {
                defaultValue: "Categorized Hotwords & Vocabulary",
              })}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            {t("settings.hotwords.desc", {
              defaultValue:
                "Provide domain-specific bias terms to speech recognition and AI cleanup prompts.",
            })}
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex rounded-lg border border-hairline bg-surface-muted p-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === cat
                  ? "bg-surface text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {cat} ({(categoriesMap[cat] || []).length})
            </button>
          ))}
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleAddWord} className="flex gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder={t("settings.hotwords.placeholder", {
            defaultValue: `Add word to ${activeCategory} (e.g. specialized terms, names)`,
          })}
          maxLength={50}
          className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-surface-muted px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newWord.trim()}
          className="gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("common.add", { defaultValue: "Add" })}
        </Button>
      </form>

      {/* Words list */}
      {words.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">
          {t("settings.hotwords.empty", {
            defaultValue: `No ${activeCategory.toLowerCase()} added yet. Add key terms to boost accuracy.`,
          })}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {words.map((word) => (
            <li
              key={word}
              className="group inline-flex h-7 items-center gap-1 rounded-md border border-hairline bg-surface-muted ps-2.5 pe-1 text-xs text-ink"
            >
              <span className="font-medium">{word}</span>
              <button
                type="button"
                onClick={() => void handleRemoveWord(word)}
                className="rounded p-0.5 text-muted hover:bg-hairline hover:text-error"
                aria-label={`Remove ${word}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Send hotwords to AI prompt toggle */}
      <div className="pt-3 border-t border-hairline">
        <ToggleSwitch
          checked={sendHotwordsToAi}
          onChange={(val) =>
            void updateSetting("send_hotwords_to_prompt", val)
          }
          isUpdating={isUpdating("send_hotwords_to_prompt")}
          label={t("settings.hotwords.sendToAiPrompt", {
            defaultValue: "Send hotwords to the AI prompt",
          })}
          description={t("settings.hotwords.sendToAiPromptDesc", {
            defaultValue:
              "When enabled, your custom hotwords are injected into the AI cleanup prompt to preserve technical terms and proper nouns.",
          })}
        />
      </div>
    </div>
  );
};
