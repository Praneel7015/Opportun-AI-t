import {
  DEFAULT_ANALYSIS_CAP,
  DEFAULT_USER_ID,
} from "@opportun-ai-t/core";

export interface AgentConfig {
  tableName: string;
  region: string;
  bedrockModelId: string;
  sesFromEmail: string;
  sesToEmail: string;
  scheduleTimezone: string;
  analysisCap: number;
  userId: string;
  /** When true, skip live Bedrock/SES and use deterministic stubs (local tests). */
  dryRun: boolean;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): AgentConfig {
  const analysisCap = Number.parseInt(
    env.ANALYSIS_CAP ?? String(DEFAULT_ANALYSIS_CAP),
    10,
  );

  return {
    tableName: env.TABLE_NAME ?? "",
    region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "ap-south-1",
    bedrockModelId: env.BEDROCK_MODEL_ID ?? "apac.amazon.nova-lite-v1:0",
    sesFromEmail: env.SES_FROM_EMAIL ?? "",
    sesToEmail: env.SES_TO_EMAIL ?? "",
    scheduleTimezone: env.SCHEDULE_TIMEZONE ?? "Asia/Kolkata",
    analysisCap: Number.isFinite(analysisCap) && analysisCap > 0
      ? analysisCap
      : DEFAULT_ANALYSIS_CAP,
    userId: env.USER_ID ?? DEFAULT_USER_ID,
    dryRun: env.AGENT_DRY_RUN === "1" || env.AGENT_DRY_RUN === "true",
  };
}
