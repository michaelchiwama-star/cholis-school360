import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { initDb } from './db';
import authRouter from './routes/auth';
import requestsRouter from './routes/requests';
import dashboardRouter from './routes/dashboard';
import publicRouter from './routes/public';
import assistantRouter from './routes/assistant';
import departmentRequestsRouter from './routes/departmentRequests';
import cholisRouter from './routes/cholis';
import notificationsRouter from './routes/notifications';
import parentEnquiriesRouter from './routes/parentEnquiries';

const app = express();

// Behind IBM Cloud's load balancer: use the visitor's real address for the
// sign-in attempt limit.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Only needed for local development, when the page runs on port 5173.
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '50kb' }));

// Basic browser security settings.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/public', publicRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/department-requests', departmentRequestsRouter);
app.use('/api/cholis', cholisRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/parent-enquiries', parentEnquiriesRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'CHOLIS School360 Lite' }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// Serve the built website (used online, where one service runs everything).
const clientDist = config.clientDistDir ?? path.join(__dirname, '../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  console.log(`Serving website from ${clientDist}`);
}

// Errors: never show internal details to visitors.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That submission is too large.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// Initialize DB then start server
initDb().then(() => {
  app.listen(config.port, () => {
    console.log(`CHOLIS School360 running on port ${config.port}`);
    console.log(config.showDemoPassword
      ? 'Demo password: default (shown on the login page)'
      : 'Demo password: custom (hidden from the login page)');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
