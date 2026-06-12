import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './app/main/data/schema.ts',
  out: './app/main/data/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './deductions.sqlite',
  },
});
