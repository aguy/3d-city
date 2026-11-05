// Chrome Built-in AI Prompt API type declarations (window.ai.languageModel)
export interface ChromeAILanguageModelSession {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): AsyncIterable<string>;
  destroy?(): void;
}

export interface ChromeAILanguageModelCapabilities {
  available: 'readily' | 'after-download' | 'no';
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface ChromeAILanguageModelFactory {
  availability?(): Promise<'readily' | 'after-download' | 'unavailable' | 'no'>;
  capabilities?(): Promise<ChromeAILanguageModelCapabilities>;
  create(options?: {
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
  }): Promise<ChromeAILanguageModelSession>;
}

declare global {
  interface Window {
    ai?: {
      languageModel?: ChromeAILanguageModelFactory;
    };
  }
}

export {};
