import crypto from 'crypto';

/**
 * Settings read from environment variables.
 *
 * Local use (your own computer): nothing needs to be set. The demo password
 * stays "demo1234" and is shown on the login page, as before.
 *
 * Online use (IBM Cloud Code Engine): set DEMO_PASSWORD and SESSION_SECRET.
 * When DEMO_PASSWORD is set, the password is NOT shown on the login page;
 * share it only with the people you invite.
 */
const envPassword = process.env.DEMO_PASSWORD?.trim();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  demoPassword: envPassword && envPassword.length > 0 ? envPassword : 'demo1234',
  // Show the password on the login page only when no custom password was set.
  showDemoPassword: !envPassword,
  // Signs login sessions. If not set, a random one is made at start-up,
  // which simply means everyone is signed out when the app restarts.
  sessionSecret: process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex'),
  sessionHours: Number(process.env.SESSION_HOURS ?? 8),
  dataDir: process.env.DATA_DIR,
  clientDistDir: process.env.CLIENT_DIST_DIR,
};
