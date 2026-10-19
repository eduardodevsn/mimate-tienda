const auth = require('../lib/auth');
const { readJson, send, sameOrigin, clientIp, handle } = require('../lib/http');

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
  if (!auth.isConfigured()) return send(res, 503, { ok: false, error: 'not_configured' });
  const ip = clientIp(req);
  if (auth.tooManyAttempts(ip)) return send(res, 429, { ok: false, error: 'too_many_attempts' });
  const body = await readJson(req, 4096);
  if (!auth.passwordOk(String(body.password || ''))) {
    auth.recordFailure(ip);
    await new Promise(resolve => setTimeout(resolve, 700));
    return send(res, 401, { ok: false, error: 'wrong_password' });
  }
  auth.clearFailures(ip);
  send(res, 200, { ok: true }, { 'Set-Cookie': auth.sessionCookie(req, auth.makeToken()) });
});
