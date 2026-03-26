import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('files', (t) => {
    t.text('checksum').nullable();
    t.index(['project_id', 'checksum'], 'files_project_checksum_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('files', (t) => {
    t.dropIndex(['project_id', 'checksum'], 'files_project_checksum_idx');
    t.dropColumn('checksum');
  });
}
