import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

const PASSWORD = '@Bcd1234';
const SALT_ROUNDS = 12;

const USERS = [
  { email: 'developer@solrum.dev', name: 'Hieu Nguyen' },
  { email: 'hungnt@solrum.dev', name: 'Nguyen Tuan Hung' },
  { email: 'phulvt@solrum.dev', name: 'Le Vuong Thien Phu' },
  { email: 'tannv@solrum.dev', name: 'Nguyen Van Tan' },
  { email: 'triphc@solrum.dev', name: 'Pham Hoang Cao Tri' },
];

export async function up(knex: Knex): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // Insert users (skip if already exist)
  for (const u of USERS) {
    const exists = await knex('users').where('email', u.email).first();
    if (!exists) {
      await knex('users').insert({
        email: u.email,
        name: u.name,
        password_hash: passwordHash,
      });
    }
  }

  // Get user records
  const users = await knex('users').whereIn('email', USERS.map((u) => u.email));
  const admin = users.find((u) => u.email === 'developer@solrum.dev')!;

  // Create org "Solrum"
  let org = await knex('organizations').where('slug', 'solrum').first();
  if (!org) {
    [org] = await knex('organizations')
      .insert({ name: 'Solrum', slug: 'solrum', created_by: admin.id })
      .returning('*');
  }

  // Add all users to org
  for (const user of users) {
    const role = user.email === 'developer@solrum.dev' ? 'admin' : 'member';
    const exists = await knex('org_members').where({ org_id: org.id, user_id: user.id }).first();
    if (!exists) {
      await knex('org_members').insert({ org_id: org.id, user_id: user.id, role });
    }
  }

  // Create project "KidSync"
  let project = await knex('projects').where({ org_id: org.id, name: 'KidSync' }).first();
  if (!project) {
    [project] = await knex('projects')
      .insert({ org_id: org.id, name: 'KidSync', description: 'Kid Sync System', created_by: admin.id })
      .returning('*');
  }

  // Create team "Developer"
  let team = await knex('teams').where({ org_id: org.id, name: 'Developer' }).first();
  if (!team) {
    [team] = await knex('teams')
      .insert({ org_id: org.id, name: 'Developer', description: 'Development team', created_by: admin.id })
      .returning('*');
  }

  // Add all users to team
  for (const user of users) {
    const exists = await knex('team_members').where({ team_id: team.id, user_id: user.id }).first();
    if (!exists) {
      await knex('team_members').insert({ team_id: team.id, user_id: user.id });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const org = await knex('organizations').where('slug', 'solrum').first();
  if (org) {
    // Cascade will handle team_members, org_members, projects, teams
    await knex('organizations').where('id', org.id).del();
  }
  await knex('users').whereIn('email', USERS.map((u) => u.email)).del();
}
