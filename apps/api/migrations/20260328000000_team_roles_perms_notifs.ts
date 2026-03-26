import type { Knex } from 'knex';

const DEFAULT_PERMISSIONS = JSON.stringify({
  viewFiles: true,
  editFiles: true,
  deleteFiles: false,
  uploadFiles: true,
  addComments: true,
  deleteComments: false,
  resolveComments: true,
  inviteMembers: true,
  removeMembers: false,
  changeRoles: false,
});

const DEFAULT_NOTIF_SETTINGS = JSON.stringify({
  newUpload: true,
  fileUpdate: true,
  newComment: true,
  commentReply: true,
  memberJoined: true,
  memberLeft: false,
});

export async function up(knex: Knex): Promise<void> {
  // 1. Add role to team_members
  await knex.schema.alterTable('team_members', (t) => {
    t.text('role').notNullable().defaultTo('member');
  });
  await knex.raw(`
    ALTER TABLE team_members
    ADD CONSTRAINT team_members_role_check
    CHECK (role IN ('admin', 'member', 'viewer'))
  `);

  // 2. Add lead_id and permissions to teams
  await knex.schema.alterTable('teams', (t) => {
    t.uuid('lead_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('permissions').notNullable().defaultTo(knex.raw(`'${DEFAULT_PERMISSIONS}'::jsonb`));
  });

  // 3. Create team_notification_settings table
  await knex.schema.createTable('team_notification_settings', (t) => {
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('settings').notNullable().defaultTo(knex.raw(`'${DEFAULT_NOTIF_SETTINGS}'::jsonb`));
    t.text('delivery').notNullable().defaultTo('inApp');
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['team_id', 'user_id']);
  });
  await knex.raw(`
    ALTER TABLE team_notification_settings
    ADD CONSTRAINT team_notif_delivery_check
    CHECK (delivery IN ('inApp', 'emailImportant', 'emailAll'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('team_notification_settings');

  await knex.schema.alterTable('teams', (t) => {
    t.dropColumn('permissions');
    t.dropColumn('lead_id');
  });

  await knex.raw('ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check');
  await knex.schema.alterTable('team_members', (t) => {
    t.dropColumn('role');
  });
}
