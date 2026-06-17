import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import {
  defaultMigrationsFolder,
  runMigrations,
} from '../../../app/main/data/migrations';
import { schema } from '../../../app/main/data/schema';

const tempDirectories: string[] = [];
const databases: DatabaseSync[] = [];

const createDatabase = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-migrations-test-'));
  tempDirectories.push(directory);
  const sqlite = new DatabaseSync(join(directory, 'deductions.sqlite'));
  databases.push(sqlite);
  sqlite.exec('pragma foreign_keys = ON');
  return {
    db: drizzle({ client: sqlite, schema }),
    sqlite,
  };
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
    const { db, sqlite } = createDatabase();

    runMigrations(db);

    const tables = sqlite
      .prepare(
        `
          select name
          from sqlite_master
          where type = 'table'
          order by name
        `,
      )
      .all() as Array<{ name: string }>;
    const indexes = sqlite
      .prepare(
        `
          select name
          from sqlite_master
          where type = 'index'
          order by name
        `,
      )
      .all() as Array<{ name: string }>;
    const documentColumns = sqlite
      .prepare('pragma table_info(documents)')
      .all() as Array<{ name: string; notnull: number; dflt_value: string | null }>;
    const invoiceItemColumns = sqlite
      .prepare('pragma table_info(invoice_items)')
      .all() as Array<{ name: string; notnull: number; dflt_value: string | null }>;

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
    expect(documentColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'status',
          notnull: 1,
          dflt_value: "'imported'",
        }),
        expect.objectContaining({
          name: 'processing_started_at',
          notnull: 0,
        }),
        expect.objectContaining({
          name: 'processing_completed_at',
          notnull: 0,
        }),
        expect.objectContaining({
          name: 'processing_error',
          notnull: 0,
        }),
        expect.objectContaining({
          name: 'processor_version',
          notnull: 0,
        }),
      ]),
    );
    expect(invoiceItemColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'deduction_reason',
          notnull: 0,
        }),
      ]),
    );
  });

  it("does not re-run migrations tracked by Drizzle's migration table shape", () => {
    const { db, sqlite } = createDatabase();

    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();

    const migrations = sqlite
      .prepare(
        `
          select id, hash, created_at, name, applied_at
          from __drizzle_migrations
          order by created_at
        `,
      )
      .all() as Array<{
        id: number;
        hash: string;
        created_at: number;
        name: string;
        applied_at: string | null;
      }>;

    expect(migrations).toHaveLength(3);
    expect(migrations).toEqual([
      expect.objectContaining({
        id: 1,
        created_at: 1781255506000,
        name: '20260612091146_initial',
      }),
      expect.objectContaining({
        id: 2,
        created_at: 1781605200000,
        name: '20260616102000_add_document_status',
      }),
      expect.objectContaining({
        id: 3,
        created_at: 1781620200000,
        name: '20260616143000_add_document_processing_metadata',
      }),
    ]);
    expect(migrations.every((migration) => migration.hash.length === 64)).toBe(
      true,
    );
  });

  it('upgrades an existing migration table from the previous Drizzle shape', () => {
    const { db, sqlite } = createDatabase();
    const migrationSql = readFileSync(
      join(defaultMigrationsFolder, '20260612091146_initial/migration.sql'),
      'utf8',
    );
    const hash = createHash('sha256').update(migrationSql).digest('hex');

    sqlite.exec(migrationSql);
    sqlite.exec(`
      create table __drizzle_migrations (
        id integer primary key autoincrement,
        hash text not null,
        created_at numeric
      )
    `);
    sqlite
      .prepare(
        `
          insert into __drizzle_migrations (hash, created_at)
          values (?, ?)
        `,
      )
      .run(hash, 1781255506428);

    expect(() => runMigrations(db)).not.toThrow();

    const migration = sqlite
      .prepare(
        `
          select hash, created_at, name, applied_at
          from __drizzle_migrations
          limit 1
        `,
      )
      .get() as {
        hash: string;
        created_at: number;
        name: string;
        applied_at: string | null;
      };

    expect(migration).toEqual({
      hash,
      created_at: 1781255506428,
      name: '20260612091146_initial',
      applied_at: null,
    });
  });
});
