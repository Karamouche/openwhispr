import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// Enterprise SDKs use Node.js APIs (process, fs) — imported dynamically
// in their respective functions to avoid crashing the Vite renderer.
import type { LanguageModel } from "ai";

export interface EnterpriseProviderConfig {
  bedrockRegion?: string;
  bedrockProfile?: string;
  bedrockAccessKeyId?: string;
  bedrockSecretAccessKey?: string;
  bedrockSessionToken?: string;
  azureEndpoint?: string;
  azureApiVersion?: string;
  vertexProject?: string;
  vertexLocation?: string;
}

export function getAIModel(
  provider: string,
  model: string,
  apiKey: string,
  baseURL?: string,
  enterprise?: EnterpriseProviderConfig
): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "groq":
      return createGroq({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "custom":
      return createOpenAI({ apiKey, baseURL })(model);
    case "local":
      return createOpenAI({
        apiKey: "no-key",
        baseURL,
      }).chat(model);
    case "bedrock":
      return createBedrockModel(model, apiKey, enterprise);
    case "azure":
      return createAzureModel(model, apiKey, enterprise);
    case "vertex":
      return createVertexModel(model, apiKey, enterprise);
    default:
      throw new Error(`Unsupported AI SDK provider: ${provider}`);
  }
}

function createBedrockModel(
  model: string,
  apiKey: string,
  enterprise?: EnterpriseProviderConfig
): LanguageModel {
  const { createAmazonBedrock } = require("@ai-sdk/amazon-bedrock");
  const region = enterprise?.bedrockRegion || "us-east-1";

  if (enterprise?.bedrockProfile) {
    const { fromNodeProviderChain } = require("@aws-sdk/credential-providers");
    return createAmazonBedrock({
      region,
      credentialProvider: fromNodeProviderChain({ profile: enterprise.bedrockProfile }),
    })(model);
  }

  if (enterprise?.bedrockAccessKeyId && enterprise?.bedrockSecretAccessKey) {
    return createAmazonBedrock({
      region,
      accessKeyId: enterprise.bedrockAccessKeyId,
      secretAccessKey: enterprise.bedrockSecretAccessKey,
      sessionToken: enterprise.bedrockSessionToken,
    })(model);
  }

  return createAmazonBedrock({ region })(model);
}

function createAzureModel(
  model: string,
  apiKey: string,
  enterprise?: EnterpriseProviderConfig
): LanguageModel {
  const { createAzure } = require("@ai-sdk/azure");
  return createAzure({
    apiKey,
    baseURL: enterprise?.azureEndpoint,
    apiVersion: enterprise?.azureApiVersion || "2024-10-21",
  })(model);
}

function createVertexModel(
  model: string,
  apiKey: string,
  enterprise?: EnterpriseProviderConfig
): LanguageModel {
  const { createVertex } = require("@ai-sdk/google-vertex");
  if (apiKey) {
    return createVertex({ apiKey })(model);
  }
  return createVertex({
    project: enterprise?.vertexProject,
    location: enterprise?.vertexLocation || "us-central1",
  })(model);
}
