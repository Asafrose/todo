import { z } from "zod";

const AI_MODE = process.env.AI_MODE || "local";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

/**
 * AI client that abstracts between Ollama (local) and OpenAI (cloud)
 */
export class AIClient {
  private mode: string;
  private ollamaUrl: string;
  private openaiKey: string;

  constructor() {
    this.mode = AI_MODE;
    this.ollamaUrl = OLLAMA_BASE_URL;
    this.openaiKey = OPENAI_API_KEY || "";
  }

  async generateText(prompt: string, model?: string): Promise<AIResponse> {
    if (this.mode === "local") {
      return this.generateWithOllama(prompt, model || "llama3.1:8b");
    } else if (this.mode === "cloud") {
      return this.generateWithOpenAI(prompt, model || "gpt-4");
    } else {
      throw new Error(`Unknown AI mode: ${this.mode}`);
    }
  }

  private async generateWithOllama(prompt: string, model: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.response,
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
        },
      };
    } catch (error) {
      throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateWithOpenAI(prompt: string, model: string): Promise<AIResponse> {
    if (!this.openaiKey) {
      throw new Error("OPENAI_API_KEY not set");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        content: choice.message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        },
      };
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const aiClient = new AIClient();
