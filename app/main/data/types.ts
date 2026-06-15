import type { DatabaseSync } from 'node:sqlite';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';

import type { schema } from './schema';

export type DeductionsSqliteClient = DatabaseSync;
export type DeductionsDatabase = NodeSQLiteDatabase<typeof schema> & {
  $client: DeductionsSqliteClient;
};
