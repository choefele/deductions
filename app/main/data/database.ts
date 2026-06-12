import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { ensureDocumentsDirectory } from './documentStorage';
import { runMigrations } from './migrations';
import {
  getActiveProfile,
  getProfileDirectory,
  readOrCreateProfileRegistry,
  type ProfileRegistry,
  type ProfileRegistryEntry,
} from './profileRegistry';
import {
  ensureManualUploadSource,
  ensureUserProfile,
  seedDevelopmentData,
} from './seedDevelopmentData';
import { schema } from './schema';
import { SqliteDeductionsData } from './sqliteDeductionsData';
import type { DeductionsDrizzleDatabase } from './types';

export type DeductionsDatabaseHandle = {
  appDataDirectory: string;
  registry: ProfileRegistry;
  activeProfile: ProfileRegistryEntry;
  profileDirectory: string;
  databasePath: string;
  sqlite: BetterSqlite3.Database;
  db: DeductionsDrizzleDatabase;
  data: SqliteDeductionsData;
  close(): void;
};

export type InitializeDeductionsDatabaseOptions = {
  appDataDirectory: string;
  migrationsFolder?: string;
  seedDevelopment?: boolean;
  now?: Date;
};

const applyPragmas = (sqlite: BetterSqlite3.Database) => {
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
};

export const initializeDeductionsDatabase = ({
  appDataDirectory,
  migrationsFolder,
  seedDevelopment = true,
  now = new Date(),
}: InitializeDeductionsDatabaseOptions): DeductionsDatabaseHandle => {
  const registry = readOrCreateProfileRegistry(appDataDirectory, now);
  const activeProfile = getActiveProfile(registry);
  const profileDirectory = getProfileDirectory(appDataDirectory, activeProfile);
  const databasePath = join(profileDirectory, 'deductions.sqlite');

  mkdirSync(profileDirectory, { recursive: true });
  ensureDocumentsDirectory(profileDirectory);

  const sqlite = new BetterSqlite3(databasePath);
  applyPragmas(sqlite);

  const db = drizzle(sqlite, { schema });
  runMigrations(db, migrationsFolder);

  const nowMs = now.getTime();
  ensureUserProfile(db, activeProfile, nowMs);
  const manualUploadSourceId = ensureManualUploadSource(db, nowMs);

  if (seedDevelopment) {
    seedDevelopmentData(db, manualUploadSourceId, nowMs);
  }

  return {
    appDataDirectory,
    registry,
    activeProfile,
    profileDirectory,
    databasePath,
    sqlite,
    db,
    data: new SqliteDeductionsData(db),
    close() {
      sqlite.close();
    },
  };
};
