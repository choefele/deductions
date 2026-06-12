import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../../app/main/data/migrations';
import { schema } from '../../../app/main/data/schema';

const tempDirectories: string[] = [];
const databases: BetterSqlite3.Database[] = [];

const createDatabase = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-migrations-test-'));
  tempDirectories.push(directory);
  const sqlite = new BetterSqlite3(join(directory, 'deductions.sqlite'));
  databases.push(sqlite);
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
};

afterEach(() => {
  while (databases.length > 0) {
    databases.pop()?.close();
  }

  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('database migrations', () => {
  it('migrates an empty database with required tables and indexes', async () => {
    const db = createDatabase();

    runMigrations(db);

    const tables = db.$client
      .prepare(
        `
          select name
          from sqlite_master
          where type = 'table'
          order by name
        `,
      )
      .all() as Array<{ name: string }>;
    const indexes = db.$client
      .prepare(
        `
          select name
          from sqlite_master
          where type = 'index'
          order by name
        `,
      )
      .all() as Array<{ name: string }>;
    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'documents',
        'invoice_items',
        'invoices',
        'sources',
        'user_profile',
      ]),
    );
    expect(indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        'documents_sha256_unique',
        'invoice_items_tax_year_category_id_idx',
        'invoice_items_review_status_idx',
        'invoices_invoice_unique',
      ]),
    );
  });
});
