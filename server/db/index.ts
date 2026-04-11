import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });

export type DbClient = typeof db;
