import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  BedrockEvaluationOutput,
  NormalizedJob,
  UserProfile,
} from "@opportun-ai-t/core";
import {
  buildDigestSystemPrompt,
  buildDigestUserPrompt,
  buildEvaluationSystemPrompt,
  buildEvaluationUserPrompt,
  buildFollowUpSystemPrompt,
} from "./prompts";
import {
  parseDigestOutput,
  parseEvaluationOutput,
  parseFollowUpOutput,
  type DigestAiOutput,
} from "./parse";

export interface BedrockClientOptions {
  region: string;
  modelId: string;
  client?: BedrockRuntimeClient;
}

export interface EvaluationResult {
  output: BedrockEvaluationOutput;
  modelId: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  retried: boolean;
}

export class BedrockEvaluator {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(options: BedrockClientOptions) {
    this.modelId = options.modelId;
    this.client =
      options.client ??
      new BedrockRuntimeClient({ region: options.region });
  }

  async evaluateJob(
    profile: UserProfile,
    job: NormalizedJob,
  ): Promise<EvaluationResult> {
    const system = buildEvaluationSystemPrompt();
    const user = buildEvaluationUserPrompt({ profile, job });
    return this.converseValidated(system, user, parseEvaluationOutput);
  }

  async writeDigest(input: Parameters<typeof buildDigestUserPrompt>[0]): Promise<{
    output: DigestAiOutput;
    modelId: string;
    latencyMs: number;
  }> {
    const system = buildDigestSystemPrompt();
    const user = buildDigestUserPrompt(input);
    const result = await this.converseValidated(system, user, parseDigestOutput);
    return {
      output: result.output,
      modelId: result.modelId,
      latencyMs: result.latencyMs,
    };
  }

  async draftFollowUp(input: {
    company: string;
    title: string;
    status: string;
    staleDays: number;
  }): Promise<{
    reminder: string;
    suggestedAction: string;
    draftEmail: string;
  }> {
    const system = buildFollowUpSystemPrompt();
    const user = JSON.stringify(input);
    try {
      const result = await this.converseValidated(
        system,
        user,
        parseFollowUpOutput,
      );
      return result.output;
    } catch {
      // Deterministic fallback — still review-only, never sent.
      const { buildFollowUpDraftContent } = await import("@opportun-ai-t/core");
      return buildFollowUpDraftContent(input);
    }
  }

  private async converseValidated<T>(
    system: string,
    user: string,
    parse: (text: string) => T,
  ): Promise<{
    output: T;
    modelId: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    retried: boolean;
  }> {
    const started = Date.now();
    let retried = false;
    let lastText = "";
    let usage: { inputTokens?: number; outputTokens?: number } = {};

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt === 1) retried = true;
      const repairHint =
        attempt === 0
          ? user
          : `${user}\n\nPrevious output was invalid JSON. Return ONLY a valid JSON object matching the schema.`;

      const response = await this.converse(system, repairHint);
      lastText = extractText(response);
      usage = {
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens,
      };

      try {
        const output = parse(lastText);
        return {
          output,
          modelId: this.modelId,
          latencyMs: Date.now() - started,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          retried,
        };
      } catch (err) {
        if (attempt === 1) {
          throw new Error(
            `Bedrock output validation failed after retry: ${err instanceof Error ? err.message : String(err)}; raw=${lastText.slice(0, 400)}`,
          );
        }
      }
    }

    throw new Error("unreachable");
  }

  private async converse(
    system: string,
    user: string,
  ): Promise<ConverseCommandOutput> {
    return this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: system }],
        messages: [
          {
            role: "user",
            content: [{ text: user }],
          },
        ],
        inferenceConfig: {
          maxTokens: 1200,
          temperature: 0.2,
        },
      }),
    );
  }
}

function extractText(response: ConverseCommandOutput): string {
  const parts = response.output?.message?.content ?? [];
  return parts
    .map((p) => ("text" in p && p.text ? p.text : ""))
    .join("")
    .trim();
}

export type { BedrockEvaluationOutput, DigestAiOutput };
