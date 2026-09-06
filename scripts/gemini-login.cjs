// Explicit, interactive Google OAuth setup. No model requests or API billing.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { CONFIG } = require('../electron/config.cjs');
const configured = CONFIG.profiles.filter(profile => profile.provider === 'Gemini');
const requested = process.env.PRISM_GEMINI_PROFILE;
const profile = requested ? configured.find(profile => profile.id === requested) : configured.length === 1 ? configured[0] : null;
if (!profile) throw new Error('Configure a Gemini profile and set PRISM_GEMINI_PROFILE when multiple profiles exist.');
const home = profile.home;
const entry = process.env.PRISM_GEMINI_ENTRY || CONFIG.geminiEntry;
if (!home || !entry || !fs.existsSync(entry)) throw new Error('Configure the Gemini home and CLI entry before signing in.');
fs.mkdirSync(home, { recursive: true });
const env = {};
for (const name of ['SystemRoot','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY']) {
  if (process.env[name]) env[name] = process.env[name];
}
env.GEMINI_CLI_HOME = home;
env.GEMINI_DEFAULT_AUTH_TYPE = 'oauth-personal';
const child = spawn(process.execPath, [entry, '--acp'], { cwd: home, env, windowsHide: true, stdio: ['pipe','pipe','pipe'] });
let id = 0, buffer = '', settled = false;
const pending = new Map();
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc:'2.0', id, method, params }) + '\n');
  });
}
child.stdout.on('data', chunk => {
  buffer += chunk;
  while (buffer.includes('\n')) {
    const index = buffer.indexOf('\n');
    const line = buffer.slice(0,index); buffer = buffer.slice(index+1);
    let message; try { message = JSON.parse(line); } catch { continue; }
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      message.error ? waiter.reject(new Error(safeError(message.error.message))) : waiter.resolve(message.result);
    }
  }
});
function safeError(message = '') {
  const labels = [
    [/Failed to exchange authorization code for tokens/i, 'OAuth callback arrived, but exchanging the authorization code failed.'],
    [/access_denied/i, 'Google declined the requested authorization.'],
    [/state mismatch/i, 'OAuth callback state did not match this login attempt.'],
    [/OAuth callback not received/i, 'The local OAuth server received an unexpected request.'],
    [/No authorization code/i, 'Google did not return an authorization code.'],
    [/timed out|ETIMEDOUT/i, 'Google authentication or network access timed out.'],
    [/ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|fetch failed/i, 'A network connection needed for Google authentication failed.'],
    [/GOOGLE_CLOUD_PROJECT/i, 'This Google account requires a Cloud project; no billing fallback was enabled.'],
  ];
  return labels.find(([pattern]) => pattern.test(message))?.[1] || 'Google OAuth could not complete. Please check the browser and retry.';
}
// CLI stderr can contain OAuth links. Never relay it to logs or conversation.
child.stderr.on('data', () => {});
child.on('error', () => finish('Gemini CLI could not start.', 1));
child.on('exit', () => { if (!settled) finish('Gemini CLI exited before authentication completed.', 1); });
function finish(message, code) {
  if (settled) return;
  settled = true;
  clearTimeout(timeout);
  console.log(message);
  child.kill();
  process.exitCode = code;
}
const timeout = setTimeout(() => finish('Google sign-in timed out. Run gemini-login.ps1 again to retry.', 1), 330000);
(async () => {
  await rpc('initialize', { protocolVersion:1, clientCapabilities:{}, clientInfo:{name:'prism-login',version:'1.0.0'} });
  console.log('Opening Google sign-in in your current default browser. Complete account selection and authorization there.');
  await rpc('authenticate', { methodId:'oauth-personal' });
  finish('Google OAuth completed. Gemini is authenticated; model execution has not yet been tested.', 0);
})().catch(error => finish(error.message, 1));
