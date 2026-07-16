import { DEFAULT_USER_ID, EntityKind } from "./constants";

/**
 * DynamoDB single-table key helpers aligned with CDK GSIs:
 *   PK / SK          — primary access
 *   GSI1PK / GSI1SK  — application status + date queries
 *   GSI2PK / GSI2SK  — entity-type + date queries
 *
 * See packages/core/README.md for item shapes and access patterns.
 */

export interface PrimaryKey {
  PK: string;
  SK: string;
}

export interface Gsi1Key {
  GSI1PK: string;
  GSI1SK: string;
}

export interface Gsi2Key {
  GSI2PK: string;
  GSI2SK: string;
}

export type DynamoKeys = PrimaryKey & Partial<Gsi1Key> & Partial<Gsi2Key>;

function userPk(userId: string = DEFAULT_USER_ID): string {
  return `USER#${userId}`;
}

export function profileKeys(userId: string = DEFAULT_USER_ID): PrimaryKey {
  return { PK: userPk(userId), SK: EntityKind.PROFILE };
}

export function sourceKeys(
  provider: string,
  boardOrSlug: string,
  userId: string = DEFAULT_USER_ID,
): PrimaryKey {
  return {
    PK: userPk(userId),
    SK: `SOURCE#${provider}#${boardOrSlug}`,
  };
}

/** Primary key only for GetItem / UpdateItem by fingerprint. */
export function jobKeys(fingerprint: string): PrimaryKey {
  return {
    PK: `JOB#${fingerprint}`,
    SK: "META",
  };
}

/** Job item keys including GSI2 date sort for discovery-time listing. */
export function jobKeysWithDate(
  fingerprint: string,
  discoveredAtIso: string,
): PrimaryKey & Gsi2Key {
  return {
    PK: `JOB#${fingerprint}`,
    SK: "META",
    GSI2PK: `ENTITY#${EntityKind.JOB}`,
    GSI2SK: `DATE#${discoveredAtIso}#${fingerprint}`,
  };
}

export function evaluationKeys(
  fingerprint: string,
  runDate: string,
): PrimaryKey & Gsi2Key {
  return {
    PK: `JOB#${fingerprint}`,
    SK: `EVAL#${runDate}`,
    GSI2PK: `ENTITY#${EntityKind.EVALUATION}`,
    GSI2SK: `DATE#${runDate}#${fingerprint}`,
  };
}

export function applicationKeys(
  fingerprint: string,
  status: string,
  updatedAtIso: string,
): PrimaryKey & Gsi1Key & Gsi2Key {
  return {
    PK: `APP#${fingerprint}`,
    SK: "META",
    GSI1PK: `APP#STATUS#${status}`,
    GSI1SK: `DATE#${updatedAtIso}#${fingerprint}`,
    GSI2PK: `ENTITY#${EntityKind.APPLICATION}`,
    GSI2SK: `DATE#${updatedAtIso}#${fingerprint}`,
  };
}

export function followUpKeys(
  fingerprint: string,
  createdAtIso: string,
): PrimaryKey & Gsi2Key {
  return {
    PK: `APP#${fingerprint}`,
    SK: `FOLLOWUP#${createdAtIso}`,
    GSI2PK: `ENTITY#${EntityKind.FOLLOWUP}`,
    GSI2SK: `DATE#${createdAtIso}#${fingerprint}`,
  };
}

export function runKeys(runDate: string): PrimaryKey & Gsi2Key {
  return {
    PK: `RUN#${runDate}`,
    SK: "META",
    GSI2PK: `ENTITY#${EntityKind.RUN}`,
    GSI2SK: `DATE#${runDate}`,
  };
}

export function dailyReportKeys(runDate: string): PrimaryKey & Gsi2Key {
  return {
    PK: `REPORT#${runDate}`,
    SK: "DAILY",
    GSI2PK: `ENTITY#${EntityKind.REPORT}`,
    GSI2SK: `DATE#${runDate}#DAILY`,
  };
}

export function weeklyReportKeys(yearWeek: string): PrimaryKey & Gsi2Key {
  return {
    PK: `REPORT#WEEK#${yearWeek}`,
    SK: "WEEKLY",
    GSI2PK: `ENTITY#${EntityKind.REPORT}`,
    GSI2SK: `WEEK#${yearWeek}`,
  };
}

/** Prefix helpers for Query operations. */
export const QueryPrefixes = {
  userSources: (userId: string = DEFAULT_USER_ID) => ({
    PK: userPk(userId),
    SKBeginsWith: "SOURCE#",
  }),
  applicationsByStatus: (status: string) => ({
    indexName: "GSI1" as const,
    GSI1PK: `APP#STATUS#${status}`,
  }),
  entitiesByType: (kind: EntityKind | string) => ({
    indexName: "GSI2" as const,
    GSI2PK: `ENTITY#${kind}`,
  }),
  followUpsForApp: (fingerprint: string) => ({
    PK: `APP#${fingerprint}`,
    SKBeginsWith: "FOLLOWUP#",
  }),
  evaluationsForJob: (fingerprint: string) => ({
    PK: `JOB#${fingerprint}`,
    SKBeginsWith: "EVAL#",
  }),
} as const;

/**
 * ISO calendar date (YYYY-MM-DD) in an IANA timezone.
 * Used as the run idempotency key (one logical run per local calendar day).
 */
export function runDateInTimezone(
  date: Date,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** ISO week key like 2026-W29 for weekly trend items. */
export function isoYearWeek(date: Date = new Date()): string {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
