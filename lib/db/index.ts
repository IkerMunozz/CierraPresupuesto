import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Prevents multiple connections during hot reloading in development
const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!, { 
  prepare: false, // Recommended for some poolers (like Supavisor/PgBouncer in transaction mode)
  max: 10         // Adjust based on your DB limits
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });