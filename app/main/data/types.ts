import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import type { schema } from './schema';

export type DeductionsDrizzleDatabase = BetterSQLite3Database<typeof schema> & {
  $client: SqliteDatabase;
};
