import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { errorHandler } from './middleware/error-handler.js';

import authRoutes from './routes/auth.routes.js';
import orgRoutes from './routes/org.routes.js';
import orgTeamRoutes from './routes/org-team.routes.js';
import projectRoutes from './routes/project.routes.js';
import fileRoutes from './routes/file.routes.js';
import commentRoutes from './routes/comment.routes.js';
import shareRoutes from './routes/share.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
app.use(express.json());

// Health check (before auth routes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no auth)
app.use('/api/auth', authRoutes);
app.use('/api', shareRoutes);

// Authenticated routes
app.use('/api/orgs', orgRoutes);
app.use('/api/orgs/:orgId/teams', orgTeamRoutes);
app.use('/api', projectRoutes);
app.use('/api', fileRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handler
app.use(errorHandler);

async function start() {
  // Auto-run migrations
  const isProduction = env.nodeEnv === 'production';
  const migrationsDir = isProduction
    ? path.resolve(__dirname, './migrations')
    : path.resolve(__dirname, '../migrations');

  try {
    const [batch, migrations] = await db.migrate.latest({
      directory: migrationsDir,
      extension: isProduction ? 'js' : 'ts',
    });
    if (migrations.length > 0) {
      console.log(`Migrations batch ${batch}: ${migrations.length} applied`);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Inspecto API running on port ${env.port}`);
  });
}

start();

export default app;
