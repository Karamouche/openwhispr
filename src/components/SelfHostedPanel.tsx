import { useTranslation } from "react-i18next";
import { Input } from "./ui/input";
import ApiKeyInput from "./ui/ApiKeyInput";
import { ProviderTabs } from "./ui/ProviderTabs";
import { Network, Globe } from "lucide-react";
import type { SelfHostedType } from "../types/electron";

interface SelfHostedPanelProps {
  service: "transcription" | "reasoning";
  selectedType: SelfHostedType;
  onTypeSelect: (type: SelfHostedType) => void;
  lanUrl: string;
  onLanUrlChange: (url: string) => void;
  compatibleUrl: string;
  onCompatibleUrlChange: (url: string) => void;
  compatibleApiKey: string;
  onCompatibleApiKeyChange: (key: string) => void;
  compatibleModel: string;
  onCompatibleModelChange: (model: string) => void;
}

const TYPE_TABS = [
  { id: "openai-compatible", name: "OpenAI Compatible" },
  { id: "lan", name: "LAN" },
];

export default function SelfHostedPanel({
  service,
  selectedType,
  onTypeSelect,
  lanUrl,
  onLanUrlChange,
  compatibleUrl,
  onCompatibleUrlChange,
  compatibleApiKey,
  onCompatibleApiKeyChange,
  compatibleModel,
  onCompatibleModelChange,
}: SelfHostedPanelProps) {
  const { t } = useTranslation();

  const renderTypeIcon = (id: string) => {
    if (id === "lan") return <Network className="w-3.5 h-3.5" />;
    return <Globe className="w-3.5 h-3.5" />;
  };

  const placeholderUrl =
    service === "transcription" ? "http://192.168.1.126:8178" : "http://192.168.1.126:8080";

  return (
    <div className="space-y-2">
      <ProviderTabs
        providers={TYPE_TABS}
        selectedId={selectedType}
        onSelect={(id) => onTypeSelect(id as SelfHostedType)}
        renderIcon={renderTypeIcon}
        colorScheme="purple"
      />

      {selectedType === "openai-compatible" ? (
        <div className="border border-border rounded-lg p-3 space-y-2.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              {t("settingsPage.selfHosted.endpointUrl")}
            </label>
            <Input
              value={compatibleUrl}
              onChange={(e) => onCompatibleUrlChange(e.target.value)}
              placeholder="https://your-server.example.com/v1"
              className="h-8 text-sm"
            />
          </div>
          <ApiKeyInput
            apiKey={compatibleApiKey}
            setApiKey={onCompatibleApiKeyChange}
            label={t("settingsPage.selfHosted.apiKeyOptional")}
            helpText=""
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">{t("common.model")}</label>
            <Input
              value={compatibleModel}
              onChange={(e) => onCompatibleModelChange(e.target.value)}
              placeholder={service === "transcription" ? "whisper-1" : "llama-3"}
              className="h-8 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-3 space-y-2.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              {t("settingsPage.selfHosted.serverUrl")}
            </label>
            <Input
              value={lanUrl}
              onChange={(e) => onLanUrlChange(e.target.value)}
              placeholder={placeholderUrl}
              className="h-8 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground/70">{t("settingsPage.selfHosted.lanHint")}</p>
        </div>
      )}
    </div>
  );
}
