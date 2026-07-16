import {
  EntityKind,
  applicationKeys,
  dailyReportKeys,
  evaluationKeys,
  followUpKeys,
  jobKeysWithDate,
  profileKeys,
  runKeys,
  sourceKeys,
  weeklyReportKeys,
  type DynamoKeys,
} from "@opportun-ai-t/core";
import {
  DEMO_APPLICATIONS,
  DEMO_DAILY_REPORTS,
  DEMO_EVALUATIONS,
  DEMO_FOLLOWUPS,
  DEMO_JOBS,
  DEMO_PROFILE,
  DEMO_RUNS,
  DEMO_SOURCES,
  DEMO_WEEKLY_REPORTS,
} from "../data/demo-seed";

/** In-memory DynamoDB stand-in (safe for CLI seed + Next server). */
export type DynamoItem = DynamoKeys & Record<string, unknown> & {
  entityType: string;
};

type MemoryDb = {
  items: Map<string, DynamoItem>;
};

declare global {
  // eslint-disable-next-line no-var
  var __opportunMemoryDb: MemoryDb | undefined;
}

function itemKey(pk: string, sk: string): string {
  return `${pk}||${sk}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function seedMemory(): MemoryDb {
  const items = new Map<string, DynamoItem>();
  const put = (item: DynamoItem) => {
    items.set(itemKey(item.PK, item.SK), item);
  };

  put({ ...profileKeys(), ...DEMO_PROFILE });

  for (const source of DEMO_SOURCES) {
    put({
      ...sourceKeys(source.provider, source.boardOrSlug),
      ...source,
    });
  }

  for (const job of DEMO_JOBS) {
    put({
      ...jobKeysWithDate(job.fingerprint, job.discoveredAt),
      ...job,
    });
  }

  for (const evaluation of DEMO_EVALUATIONS) {
    put({
      ...evaluationKeys(evaluation.fingerprint, evaluation.runDate),
      ...evaluation,
    });
  }

  for (const application of DEMO_APPLICATIONS) {
    put({
      ...applicationKeys(
        application.fingerprint,
        application.status,
        application.updatedAt,
      ),
      ...application,
    });
  }

  for (const followUp of DEMO_FOLLOWUPS) {
    put({
      ...followUpKeys(followUp.fingerprint, followUp.createdAt),
      ...followUp,
    });
  }

  for (const run of DEMO_RUNS) {
    put({ ...runKeys(run.runDate), ...run });
  }

  for (const report of DEMO_DAILY_REPORTS) {
    put({ ...dailyReportKeys(report.runDate), ...report });
  }

  for (const report of DEMO_WEEKLY_REPORTS) {
    put({ ...weeklyReportKeys(report.yearWeek), ...report });
  }

  return { items };
}

export function getMemoryDb(): MemoryDb {
  if (!globalThis.__opportunMemoryDb) {
    globalThis.__opportunMemoryDb = seedMemory();
  }
  return globalThis.__opportunMemoryDb;
}

export function resetMemoryDb(): void {
  globalThis.__opportunMemoryDb = seedMemory();
}

export function memoryPut(item: DynamoItem): void {
  getMemoryDb().items.set(itemKey(item.PK, item.SK), clone(item));
}

export function memoryGet(pk: string, sk: string): DynamoItem | undefined {
  const item = getMemoryDb().items.get(itemKey(pk, sk));
  return item ? clone(item) : undefined;
}

export function memoryQueryByPk(pk: string, skPrefix?: string): DynamoItem[] {
  const out: DynamoItem[] = [];
  for (const item of getMemoryDb().items.values()) {
    if (item.PK !== pk) continue;
    if (skPrefix && !String(item.SK).startsWith(skPrefix)) continue;
    out.push(clone(item));
  }
  return out;
}

export function memoryQueryGsi1(gsi1pk: string): DynamoItem[] {
  const out: DynamoItem[] = [];
  for (const item of getMemoryDb().items.values()) {
    if (item.GSI1PK !== gsi1pk) continue;
    out.push(clone(item));
  }
  return out;
}

export function memoryQueryGsi2(gsi2pk: string): DynamoItem[] {
  const out: DynamoItem[] = [];
  for (const item of getMemoryDb().items.values()) {
    if (item.GSI2PK !== gsi2pk) continue;
    out.push(clone(item));
  }
  return out.sort((a, b) =>
    String(b.GSI2SK ?? "").localeCompare(String(a.GSI2SK ?? "")),
  );
}

export function memoryDelete(pk: string, sk: string): void {
  getMemoryDb().items.delete(itemKey(pk, sk));
}

export function memoryAllItems(): DynamoItem[] {
  return [...getMemoryDb().items.values()].map(clone);
}

/** @deprecated EntityKind import helper for callers */
export { EntityKind };
