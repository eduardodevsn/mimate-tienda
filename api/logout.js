const auth = require('../lib/auth');
const { send, sameOrigin, handle } = require('../lib/http');

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
  send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie(req) });
});
