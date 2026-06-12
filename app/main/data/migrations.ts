import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { schema } from './schema';

export const defaultMigrationsFolder = fileURLToPath(
  new URL('./drizzle', import.meta.url),
);

const getElectronResourcesPath = () =>
  (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;

export const resolveMigrationsFolder = () => {
  const resourcesPath = getElectronResourcesPath();
  const candidates = [
    defaultMigrationsFolder,
    join(process.cwd(), 'app/main/data/drizzle'),
    resourcesPath ? join(resourcesPath, 'app.asar', 'app/main/data/drizzle') : '',
    resourcesPath ? join(resourcesPath, 'app', 'app/main/data/drizzle') : '',
  ].filter(Boolean);

  const migrationsFolder = candidates.find((candidate) =>
    existsSync(join(candidate, 'meta/_journal.json')),
  );

  if (!migrationsFolder) {
    throw new Error(
      `Could not find Drizzle migrations folder. Checked: ${candidates.join(', ')}`,
    );
  }

  return migrationsFolder;
};

export const runMigrations = (
  db: BetterSQLite3Database<typeof schema>,
  migrationsFolder = resolveMigrationsFolder(),
) => {
  migrate(db, { migrationsFolder });
};
