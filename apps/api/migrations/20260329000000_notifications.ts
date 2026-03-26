import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');

    // Notification type: file_upload, file_update, comment_new, comment_reply, member_joined, member_left
    t.text('type').notNullable();
    t.text('title').notNullable();
    t.text('body').notNullable();

    // Context references (nullable — depends on type)
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('team_id').nullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('file_id').nullable();
    t.uuid('comment_id').nullable();

    t.boolean('read').notNullable().defaultTo(false);
    t.timestamp('read_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['user_id', 'read', 'created_at'], 'idx_notifications_user_unread');
    t.index(['user_id', 'created_at'], 'idx_notifications_user_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
