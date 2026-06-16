import type { AiProviderSettings } from './types';

export const resolveAiProviderSettings = (): AiProviderSettings | null => {
  if (process.env.DEDUCTIONS_AI_DISABLED === '1') {
    return null;
  }

  return {
    providerKind: 'openai-compatible',
    providerLabel: process.env.DEDUCTIONS_AI_PROVIDER_LABEL ?? 'LM Studio',
    baseUrl: process.env.DEDUCTIONS_AI_BASE_URL ?? 'http://localhost:1234/v1',
    modelId: process.env.DEDUCTIONS_AI_MODEL_ID ?? 'gemma-4',
    apiKey: process.env.DEDUCTIONS_AI_API_KEY ?? 'lm-studio',
  };
};
