import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

import type { DeductionsDatabase } from './types';

export const defaultMigrationsFolder = fileURLToPath(
  new URL('./drizzle', import.meta.url),
);

const getElectronResourcesPath = () =>
  (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;

const hasMigrationFiles = (folder: string) => {
  if (!existsSync(folder)) {
    return false;
  }

  return readdirSync(folder, { withFileTypes: true }).some(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(folder, entry.name, 'migration.sql')),
  );
};

export const resolveMigrationsFolder = () => {
  const resourcesPath = getElectronResourcesPath();
  const candidates = [
    defaultMigrationsFolder,
    join(process.cwd(), 'app/main/data/drizzle'),
    resourcesPath ? join(resourcesPath, 'drizzle') : '',
    resourcesPath ? join(resourcesPath, 'app.asar', 'app/main/data/drizzle') : '',
    resourcesPath ? join(resourcesPath, 'app', 'app/main/data/drizzle') : '',
  ].filter(Boolean);

  const migrationsFolder = candidates.find(hasMigrationFiles);

  if (!migrationsFolder) {
    throw new Error(
      `Could not find Drizzle migrations folder. Checked: ${candidates.join(', ')}`,
    );
  }

  return migrationsFolder;
};

export const runMigrations = (
  db: DeductionsDatabase,
  migrationsFolder = resolveMigrationsFolder(),
) => {
  migrate(db, { migrationsFolder });
};
