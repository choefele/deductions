import { createRequire } from 'node:module';

import type * as NodeSqlite from 'node:sqlite';

const require = createRequire(import.meta.url);
const sqlite = require('node:sqlite') as typeof NodeSqlite;

export const DatabaseSync = sqlite.DatabaseSync;
export type SQLInputValue = NodeSqlite.SQLInputValue;
