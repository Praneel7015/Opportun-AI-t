import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let docClient: DynamoDBDocumentClient | null = null;

export function getTableName(): string | undefined {
  const name = process.env.TABLE_NAME?.trim();
  return name || undefined;
}

export function getAwsRegion(): string {
  // Amplify Console forbids custom env keys starting with AWS_.
  // Prefer APP_REGION there; runtime may still inject AWS_REGION.
  return (
    process.env.APP_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "ap-south-1"
  );
}

/**
 * True when we should use the in-memory demo store:
 * - DEMO_MODE=1 explicitly, or
 * - TABLE_NAME missing (typical local `npm run dev` before deploy)
 */
export function useMemoryStore(): boolean {
  if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") {
    return true;
  }
  if (process.env.DEMO_MODE === "0" || process.env.DEMO_MODE === "false") {
    return false;
  }
  return !getTableName();
}

export function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({ region: getAwsRegion() });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}
