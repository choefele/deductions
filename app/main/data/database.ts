import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';

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
import type { DeductionsDatabase, DeductionsSqliteClient } from './types';

export type DeductionsDatabaseHandle = {
  appDataDirectory: string;
  registry: ProfileRegistry;
  activeProfile: ProfileRegistryEntry;
  profileDirectory: string;
  databasePath: string;
  manualUploadSourceId: string;
  sqlite: DeductionsSqliteClient;
  db: DeductionsDatabase;
  data: SqliteDeductionsData;
  close(): void;
};

export type InitializeDeductionsDatabaseOptions = {
  appDataDirectory: string;
  migrationsFolder?: string;
  seedDevelopment?: boolean;
  now?: Date;
};

const applyPragmas = (sqlite: DeductionsSqliteClient) => {
  sqlite.exec('pragma foreign_keys = ON');
  sqlite.exec('pragma journal_mode = WAL');
  sqlite.exec('pragma busy_timeout = 5000');
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

  const sqlite = new DatabaseSync(databasePath);
  applyPragmas(sqlite);
  const db = drizzle({ client: sqlite, schema });
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
    manualUploadSourceId,
    sqlite,
    db,
    data: new SqliteDeductionsData(db, profileDirectory),
    close() {
      sqlite.close();
    },
  };
};
