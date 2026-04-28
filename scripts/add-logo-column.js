const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
const db = drizzle(sql);

async function addLogoColumn() {
  try {
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT`;
    console.log('✅ Columna logo añadida exitosamente a la tabla companies');
  } catch (error) {
    console.error('❌ Error añadiendo columna logo:', error);
  } finally {
    await sql.end();
  }
}

addLogoColumn();