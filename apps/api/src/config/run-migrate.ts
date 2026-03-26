import knex from 'knex';
import { env } from './env.js';
import path from 'node:path';

const db = knex({
  client: 'pg',
  connection: env.databaseUrl,
  migrations: {
    directory: path.resolve(__dirname, '../../migrations'),
    extension: 'ts',
  },
});

const command = process.argv[2] ?? 'latest';

async function main() {
  try {
    if (command === 'latest') {
      const [batch, migrations] = await db.migrate.latest();
      console.log(`Batch ${batch}: ${migrations.length} migrations run`);
      for (const m of migrations) console.log(`  + ${m}`);
    } else if (command === 'rollback') {
      const [batch, migrations] = await db.migrate.rollback();
      console.log(`Batch ${batch}: ${migrations.length} migrations rolled back`);
      for (const m of migrations) console.log(`  - ${m}`);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
