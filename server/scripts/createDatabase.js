require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const database = process.env.DB_DATABASE?.trim();
  if (!database) throw new Error('DB_DATABASE no está configurado.');

  const client = new Client({
    host: process.env.DB_HOST?.trim(),
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER?.trim(),
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (found.rowCount) {
      console.log(`La base ya existe: ${database}`);
      return;
    }

    const safeDatabaseName = database.replace(/"/g, '""');
    await client.query(`CREATE DATABASE "${safeDatabaseName}"`);
    console.log(`Base creada: ${database}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exit(1);
});
