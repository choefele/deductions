# Deductions

Desktop app for collecting invoices for tax declaration preparation.

## Database Migrations

SQLite schema is defined in TypeScript at `app/main/data/schema.ts`.
Drizzle Kit generates migration files into `app/main/data/drizzle`.

Generate migrations with:

```bash
npm run db:generate
```

This uses `drizzle.config.ts`, which points Drizzle Kit at the schema file and migration output folder.

Generated migration artifacts should be committed as-is:

- `app/main/data/drizzle/*.sql`
- `app/main/data/drizzle/meta/_journal.json`
- `app/main/data/drizzle/meta/*_snapshot.json`

Do not hand-edit generated migration files unless a migration genuinely needs custom SQL. If custom SQL is needed, document why in the migration review.

### Manual Drizzle Command

To manually create the initial migration with the current naming convention from an empty migration folder:

```bash
npx drizzle-kit generate \
  --dialect sqlite \
  --schema ./app/main/data/schema.ts \
  --out ./app/main/data/drizzle \
  --name initial \
  --prefix index
```

After generating migrations, run:

```bash
npx tsc --noEmit
npm test
npm run lint
```
