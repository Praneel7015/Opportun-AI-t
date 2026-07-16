import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let docClient: DynamoDBDocumentClient | null = null;

export function getTableName(): string | undefined {
  const name = process.env.TABLE_NAME?.trim();
  return name || undefined;
}

export function getAwsRegion(): string {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-west-2"
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
