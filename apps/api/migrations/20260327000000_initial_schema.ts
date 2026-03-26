import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // ─── Users ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('email').unique().notNullable();
    t.text('name').notNullable();
    t.text('password_hash').notNullable();
    t.text('avatar_url');
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.specificType('updated_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
  });

  // ─── Password reset tokens ────────────────────────────────────────────────
  await knex.schema.createTable('password_reset_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('token').notNullable().unique();
    t.specificType('expires_at', 'timestamptz').notNullable();
    t.specificType('used_at', 'timestamptz').nullable();
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    // index on user_id for cascade deletes and user lookups
    t.index(['user_id'], 'idx_password_reset_tokens_user');
  });

  // ─── Organizations (top-level workspace) ─────────────────────────────────
  await knex.schema.createTable('organizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('slug').unique().notNullable();
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.specificType('updated_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
  });

  // ─── Org members ─────────────────────────────────────────────────────────
  await knex.schema.createTable('org_members', (t) => {
    t.uuid('org_id').references('id').inTable('organizations').onDelete('CASCADE').notNullable();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.text('role').notNullable().defaultTo('member');
    t.specificType('joined_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.primary(['org_id', 'user_id']);
    t.index(['org_id'], 'idx_org_members_org');
    // index user_id for "list my orgs" queries
    t.index(['user_id'], 'idx_org_members_user');
  });

  // CHECK constraint: valid roles only
  await knex.raw(`
    ALTER TABLE org_members
    ADD CONSTRAINT org_members_role_check
    CHECK (role IN ('admin', 'member', 'viewer'))
  `);

  // ─── Teams (sub-groups within an org: dev, design, etc.) ─────────────────
  await knex.schema.createTable('teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('org_id').references('id').inTable('organizations').onDelete('CASCADE').notNullable();
    t.text('name').notNullable();
    t.text('description');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.specificType('updated_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.index(['org_id'], 'idx_teams_org');
  });

  // ─── Team members (sub-team membership) ──────────────────────────────────
  await knex.schema.createTable('team_members', (t) => {
    t.uuid('team_id').references('id').inTable('teams').onDelete('CASCADE').notNullable();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.specificType('joined_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.primary(['team_id', 'user_id']);
    // index user_id for reverse lookups: "which teams is this user in?"
    t.index(['user_id'], 'idx_team_members_user');
  });

  // ─── Projects ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('org_id').references('id').inTable('organizations').onDelete('CASCADE').notNullable();
    t.text('name').notNullable();
    t.text('description');
    t.boolean('archived').notNullable().defaultTo(false);
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.specificType('updated_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.index(['org_id'], 'idx_projects_org');
  });

  // ─── Files ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('files', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').notNullable();
    t.text('name').notNullable();
    t.text('original_filename');
    t.uuid('current_version_id'); // FK added below after file_versions
    t.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('deleted_at', 'timestamptz').nullable();
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.specificType('updated_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    // partial index: active files only (soft-delete pattern)
    t.index(['project_id'], 'idx_files_project');
  });

  // Partial index for active files (WHERE deleted_at IS NULL) — much smaller,
  // avoids scanning soft-deleted rows in every query
  await knex.raw(`
    CREATE INDEX idx_files_project_active
    ON files (project_id)
    WHERE deleted_at IS NULL
  `);

  // ─── File versions ────────────────────────────────────────────────────────
  await knex.schema.createTable('file_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('file_id').references('id').inTable('files').onDelete('CASCADE').notNullable();
    t.integer('version_number').notNullable();
    t.text('s3_key').notNullable();
    t.bigInteger('file_size_bytes').notNullable();
    t.text('thumbnail_s3_key');
    t.jsonb('node_summary');
    t.jsonb('frame_index'); // Array of FrameIndexEntry
    t.text('commit_message');
    t.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.unique(['file_id', 'version_number']);
    t.index(['file_id'], 'idx_file_versions_file_id');
  });

  // GIN index on node_summary for fast JSONB containment queries
  await knex.raw(`
    CREATE INDEX idx_file_versions_node_summary_gin
    ON file_versions USING gin (node_summary jsonb_path_ops)
    WHERE node_summary IS NOT NULL
  `);

  // Add FK from files → file_versions (circular, added after both tables exist)
  await knex.schema.alterTable('files', (t) => {
    t.foreign('current_version_id').references('id').inTable('file_versions').onDelete('SET NULL');
  });
  // index current_version_id for FK integrity checks
  await knex.raw(`
    CREATE INDEX idx_files_current_version
    ON files (current_version_id)
    WHERE current_version_id IS NOT NULL
  `);

  // ─── Version diffs ────────────────────────────────────────────────────────
  await knex.schema.createTable('version_diffs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('file_id').references('id').inTable('files').onDelete('CASCADE').notNullable();
    t.uuid('from_version_id').references('id').inTable('file_versions').onDelete('CASCADE').notNullable();
    t.uuid('to_version_id').references('id').inTable('file_versions').onDelete('CASCADE').notNullable();
    t.jsonb('diff_data').notNullable();
    t.text('summary');
    t.specificType('computed_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.unique(['from_version_id', 'to_version_id']);
    // index file_id for "list all diffs for a file" queries
    t.index(['file_id'], 'idx_version_diffs_file');
  });

  // ─── Comments ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('file_id').references('id').inTable('files').onDelete('CASCADE').notNullable();
    t.uuid('version_id').references('id').inTable('file_versions').onDelete('SET NULL');
    t.uuid('parent_comment_id').references('id').inTable('comments').onDelete('CASCADE');
    t.uuid('author_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.text('body').notNullable();

    // ── Anchor: frame-level (always required for node comments) ──────────────
    // frame_id identifies which frame the comment lives in — enables fast
    // per-frame query without fetching the .pen file
    t.text('frame_id');
    // Pin position relative to frame dimensions (0.0–1.0).
    // Always valid even if the anchored node is deleted (orphaned comments
    // stay visible at the last-known location within the frame).
    t.double('pin_x_ratio');
    t.double('pin_y_ratio');

    // ── Anchor: node-level (nullable = frame-level comment) ──────────────────
    t.text('node_id');   // node id in .pen file; null = pinned to frame coords
    // Metadata snapshot at comment creation time — used for fuzzy carry-forward
    // across versions when node_id disappears.
    // Shape: { name, type, parentId, bbox: { x, y, w, h } }
    t.jsonb('anchor_meta');
    // Carry-forward status, updated each time a new version is uploaded.
    // active        — node_id still exists in latest version
    // moved         — node moved but still exists (pin updated to new ratio)
    // orphaned      — node deleted, no fuzzy match found
    // fuzzy_matched — node deleted but a similar node was found
    t.text('anchor_status').notNullable().defaultTo('active');

    t.boolean('resolved').notNullable().defaultTo(false);
    t.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('resolved_at', 'timestamptz').nullable();
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    t.specificType('updated_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());

    // Fast per-frame fetch: "all comments for frame X in file Y"
    t.index(['file_id', 'frame_id'], 'idx_comments_file_frame');
    t.index(['file_id', 'version_id'], 'idx_comments_file_version');
    t.index(['node_id'], 'idx_comments_node_id');
    t.index(['author_id'], 'idx_comments_author');
    t.index(['parent_comment_id'], 'idx_comments_parent');
  });

  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_anchor_status_check
    CHECK (anchor_status IN ('active', 'moved', 'orphaned', 'fuzzy_matched'))
  `);

  // ─── Share links ──────────────────────────────────────────────────────────
  await knex.schema.createTable('share_links', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('file_id').references('id').inTable('files').onDelete('CASCADE').notNullable();
    t.text('token').unique().notNullable();
    t.text('permission').notNullable().defaultTo('view');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.specificType('expires_at', 'timestamptz').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.specificType('created_at', 'timestamptz').notNullable().defaultTo(knex.fn.now());
    // index file_id for "list share links for a file" queries
    t.index(['file_id'], 'idx_share_links_file');
    t.index(['token'], 'idx_share_links_token');
  });

  // CHECK constraint: valid permissions only
  await knex.raw(`
    ALTER TABLE share_links
    ADD CONSTRAINT share_links_permission_check
    CHECK (permission IN ('view', 'download', 'comment'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('share_links');
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('version_diffs');
  await knex.schema.alterTable('files', (t) => { t.dropForeign('current_version_id'); });
  await knex.schema.dropTableIfExists('file_versions');
  await knex.schema.dropTableIfExists('files');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('teams');
  await knex.schema.dropTableIfExists('org_members');
  await knex.schema.dropTableIfExists('organizations');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('users');
}
