import type { Knex } from 'knex';
import { env } from './env.js';

const config: Knex.Config = {
  client: 'pg',
  connection: env.databaseUrl,
  migrations: {
    directory: '../migrations',
    extension: 'ts',
  },
  seeds: {
    directory: '../seeds',
  },
};

export default config;
