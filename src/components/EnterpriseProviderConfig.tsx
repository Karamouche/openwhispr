import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "./ui/input";
import ApiKeyInput from "./ui/ApiKeyInput";
import ModelCardList from "./ui/ModelCardList";
import CustomModelInput from "./ui/CustomModelInput";
import TestConnectionButton from "./TestConnectionButton";
import { REASONING_PROVIDERS } from "../models/ModelRegistry";
import { modelRegistry } from "../models/ModelRegistry";
import { getProviderIcon, isMonochromeProvider } from "../utils/providerIcons";

interface EnterpriseProviderConfigProps {
  provider: "bedrock" | "azure" | "vertex";
  reasoningModel: string;
  setReasoningModel: (model: string) => void;
  // Bedrock
  bedrockAuthMode: string;
  setBedrockAuthMode: (v: string) => void;
  bedrockRegion: string;
  setBedrockRegion: (v: string) => void;
  bedrockProfile: string;
  setBedrockProfile: (v: string) => void;
  bedrockAccessKeyId: string;
  setBedrockAccessKeyId: (v: string) => void;
  bedrockSecretAccessKey: string;
  setBedrockSecretAccessKey: (v: string) => void;
  bedrockSessionToken: string;
  setBedrockSessionToken: (v: string) => void;
  // Azure
  azureEndpoint: string;
  setAzureEndpoint: (v: string) => void;
  azureApiKey: string;
  setAzureApiKey: (v: string) => void;
  azureDeploymentName: string;
  setAzureDeploymentName: (v: string) => void;
  azureApiVersion: string;
  setAzureApiVersion: (v: string) => void;
  // Vertex
  vertexAuthMode: string;
  setVertexAuthMode: (v: string) => void;
  vertexProject: string;
  setVertexProject: (v: string) => void;
  vertexLocation: string;
  setVertexLocation: (v: string) => void;
  vertexApiKey: string;
  setVertexApiKey: (v: string) => void;
}

const BEDROCK_REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-northeast-1",
  "ap-southeast-1",
];

const VERTEX_LOCATIONS = [
  "us-central1",
  "us-east4",
  "europe-west4",
  "asia-northeast1",
  "asia-southeast1",
];

function AuthModeToggle({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
            value === opt.id
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground/70">{children}</p>;
}

function BedrockConfig(props: EnterpriseProviderConfigProps) {
  const { t } = useTranslation();

  const suggestedModels = useMemo(() => {
    const providerData = REASONING_PROVIDERS.bedrock;
    if (!providerData?.models?.length) return [];
    const iconUrl = getProviderIcon("bedrock");
    const invertInDark = isMonochromeProvider("bedrock");
    return providerData.models.map((m) => ({
      ...m,
      description: m.descriptionKey
        ? t(m.descriptionKey, { defaultValue: m.description })
        : m.description,
      icon: iconUrl,
      invertInDark,
    }));
  }, [t]);

  const getTestConfig = () => ({
    bedrockRegion: props.bedrockRegion,
    bedrockProfile: props.bedrockAuthMode === "sso" ? props.bedrockProfile : "",
    bedrockAccessKeyId: props.bedrockAuthMode === "keys" ? props.bedrockAccessKeyId : "",
    bedrockSecretAccessKey: props.bedrockAuthMode === "keys" ? props.bedrockSecretAccessKey : "",
    bedrockSessionToken: props.bedrockAuthMode === "keys" ? props.bedrockSessionToken : "",
    model: props.reasoningModel,
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.authMode", { defaultValue: "Authentication" })}
        </FieldLabel>
        <AuthModeToggle
          options={[
            {
              id: "sso",
              label: t("reasoning.enterprise.ssoProfile", { defaultValue: "SSO Profile" }),
            },
            {
              id: "keys",
              label: t("reasoning.enterprise.accessKeys", { defaultValue: "Access Keys" }),
            },
          ]}
          value={props.bedrockAuthMode}
          onChange={props.setBedrockAuthMode}
        />
      </div>

      {props.bedrockAuthMode === "sso" ? (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <FieldLabel>
              {t("reasoning.enterprise.profile", { defaultValue: "Profile Name" })}
            </FieldLabel>
            <Input
              value={props.bedrockProfile}
              onChange={(e) => props.setBedrockProfile(e.target.value)}
              placeholder="default"
              className="text-sm"
            />
            <FieldHint>
              {t("reasoning.enterprise.bedrock.ssoHelp", {
                defaultValue:
                  "Uses your AWS CLI SSO configuration. Ensure you have run 'aws sso login'.",
              })}
            </FieldHint>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <FieldLabel>
              {t("reasoning.enterprise.accessKeyId", { defaultValue: "Access Key ID" })}
            </FieldLabel>
            <ApiKeyInput
              apiKey={props.bedrockAccessKeyId}
              setApiKey={props.setBedrockAccessKeyId}
              label=""
              placeholder="AKIA..."
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>
              {t("reasoning.enterprise.secretAccessKey", { defaultValue: "Secret Access Key" })}
            </FieldLabel>
            <ApiKeyInput
              apiKey={props.bedrockSecretAccessKey}
              setApiKey={props.setBedrockSecretAccessKey}
              label=""
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>
              {t("reasoning.enterprise.sessionToken", {
                defaultValue: "Session Token (optional)",
              })}
            </FieldLabel>
            <Input
              value={props.bedrockSessionToken}
              onChange={(e) => props.setBedrockSessionToken(e.target.value)}
              placeholder=""
              className="text-sm"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <FieldLabel>{t("reasoning.enterprise.region", { defaultValue: "Region" })}</FieldLabel>
        <select
          value={props.bedrockRegion}
          onChange={(e) => props.setBedrockRegion(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {BEDROCK_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {suggestedModels.length > 0 && (
        <div className="space-y-1.5">
          <FieldLabel>
            {t("reasoning.enterprise.suggestedModels", { defaultValue: "Suggested Models" })}
          </FieldLabel>
          <ModelCardList
            models={suggestedModels}
            selectedModel={props.reasoningModel}
            onModelSelect={props.setReasoningModel}
            colorScheme="purple"
          />
        </div>
      )}

      <CustomModelInput value={props.reasoningModel} onChange={props.setReasoningModel} />

      <TestConnectionButton provider="bedrock" getConfig={getTestConfig} />
    </div>
  );
}

function AzureConfig(props: EnterpriseProviderConfigProps) {
  const { t } = useTranslation();

  const getTestConfig = () => ({
    azureEndpoint: props.azureEndpoint,
    azureApiVersion: props.azureApiVersion,
    apiKey: props.azureApiKey,
    model: props.azureDeploymentName || props.reasoningModel,
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.endpoint", { defaultValue: "Endpoint URL" })}
        </FieldLabel>
        <Input
          value={props.azureEndpoint}
          onChange={(e) => props.setAzureEndpoint(e.target.value)}
          placeholder="https://yourresource.openai.azure.com"
          className="text-sm"
        />
        <FieldHint>
          {t("reasoning.enterprise.azure.endpointHelp", {
            defaultValue:
              "Your Azure OpenAI resource endpoint (e.g., https://myresource.openai.azure.com).",
          })}
        </FieldHint>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>API Key</FieldLabel>
        <ApiKeyInput
          apiKey={props.azureApiKey}
          setApiKey={props.setAzureApiKey}
          label=""
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.deploymentName", { defaultValue: "Deployment Name" })}
        </FieldLabel>
        <Input
          value={props.azureDeploymentName}
          onChange={(e) => {
            props.setAzureDeploymentName(e.target.value);
            props.setReasoningModel(e.target.value);
          }}
          placeholder="gpt-4o-deployment"
          className="text-sm font-mono"
        />
        <FieldHint>
          {t("reasoning.enterprise.azure.deploymentHelp", {
            defaultValue: "The name of your model deployment in Azure OpenAI.",
          })}
        </FieldHint>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.apiVersion", { defaultValue: "API Version" })}
        </FieldLabel>
        <Input
          value={props.azureApiVersion}
          onChange={(e) => props.setAzureApiVersion(e.target.value)}
          placeholder="2024-10-21"
          className="text-sm font-mono"
        />
      </div>

      <TestConnectionButton provider="azure" getConfig={getTestConfig} />
    </div>
  );
}

function VertexConfig(props: EnterpriseProviderConfigProps) {
  const { t } = useTranslation();

  const suggestedModels = useMemo(() => {
    const providerData = REASONING_PROVIDERS.vertex;
    if (!providerData?.models?.length) return [];
    const iconUrl = getProviderIcon("vertex");
    const invertInDark = isMonochromeProvider("vertex");
    return providerData.models.map((m) => ({
      ...m,
      description: m.descriptionKey
        ? t(m.descriptionKey, { defaultValue: m.description })
        : m.description,
      icon: iconUrl,
      invertInDark,
    }));
  }, [t]);

  const getTestConfig = () => ({
    vertexProject: props.vertexProject,
    vertexLocation: props.vertexLocation,
    apiKey: props.vertexAuthMode === "apikey" ? props.vertexApiKey : "",
    model: props.reasoningModel,
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.authMode", { defaultValue: "Authentication" })}
        </FieldLabel>
        <AuthModeToggle
          options={[
            {
              id: "adc",
              label: t("reasoning.enterprise.adc", {
                defaultValue: "Application Default Credentials",
              }),
            },
            {
              id: "apikey",
              label: t("reasoning.enterprise.apiKeyMode", { defaultValue: "API Key" }),
            },
          ]}
          value={props.vertexAuthMode}
          onChange={props.setVertexAuthMode}
        />
      </div>

      {props.vertexAuthMode === "apikey" ? (
        <div className="space-y-1.5">
          <FieldLabel>API Key</FieldLabel>
          <ApiKeyInput
            apiKey={props.vertexApiKey}
            setApiKey={props.setVertexApiKey}
            label=""
            helpText={t("reasoning.enterprise.vertex.apikeyHelp", {
              defaultValue: "Vertex AI Express Mode API key from Google AI Studio.",
            })}
          />
        </div>
      ) : (
        <FieldHint>
          {t("reasoning.enterprise.vertex.adcHelp", {
            defaultValue:
              "Uses Application Default Credentials. Run: gcloud auth application-default login",
          })}
        </FieldHint>
      )}

      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.projectId", { defaultValue: "Project ID" })}
        </FieldLabel>
        <Input
          value={props.vertexProject}
          onChange={(e) => props.setVertexProject(e.target.value)}
          placeholder="my-gcp-project-123"
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>
          {t("reasoning.enterprise.location", { defaultValue: "Location" })}
        </FieldLabel>
        <select
          value={props.vertexLocation}
          onChange={(e) => props.setVertexLocation(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {VERTEX_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {suggestedModels.length > 0 && (
        <div className="space-y-1.5">
          <FieldLabel>
            {t("reasoning.enterprise.suggestedModels", { defaultValue: "Suggested Models" })}
          </FieldLabel>
          <ModelCardList
            models={suggestedModels}
            selectedModel={props.reasoningModel}
            onModelSelect={props.setReasoningModel}
            colorScheme="purple"
          />
        </div>
      )}

      <CustomModelInput value={props.reasoningModel} onChange={props.setReasoningModel} />

      <TestConnectionButton provider="vertex" getConfig={getTestConfig} />
    </div>
  );
}

export default function EnterpriseProviderConfig(props: EnterpriseProviderConfigProps) {
  switch (props.provider) {
    case "bedrock":
      return <BedrockConfig {...props} />;
    case "azure":
      return <AzureConfig {...props} />;
    case "vertex":
      return <VertexConfig {...props} />;
    default:
      return null;
  }
}
