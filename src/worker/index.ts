import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './auth.js';
import { setupRoutes } from './routes/setup.js';
import { authRoutes } from './routes/auth.js';
import { branchRoutes } from './routes/branches.js';
import { userRoutes } from './routes/users.js';
import { invoiceRoutes } from './routes/invoices.js';
import { reportRoutes } from './routes/reports.js';
import { statsRoutes } from './routes/stats.js';
import { exportRoutes } from './routes/exports.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['*'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));

app.use('/api/*', async (c, next) => {
  c.set('DB', c.env.DB);
  await next();
});

// Public routes
app.route('/api', setupRoutes);
app.route('/api', authRoutes);

// Protected routes
const protectedApi = new Hono<{ Bindings: Env }>().basePath('/api');
protectedApi.route('/', statsRoutes);
protectedApi.route('/', branchRoutes);
protectedApi.route('/', userRoutes);
protectedApi.route('/', invoiceRoutes);
protectedApi.route('/', reportRoutes);
protectedApi.route('/', exportRoutes);
app.route('/', protectedApi);

// Serve static assets (frontend)
app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ message: 'Not found' }, 404);
  }
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    const url = new URL(c.req.url);
    url.pathname = '/index.html';
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  }
  return res;
});

export default app;
