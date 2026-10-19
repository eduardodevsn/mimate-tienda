const auth = require('../lib/auth');
const storage = require('../lib/storage');
const { isJpeg } = require('../lib/validate');
const { readBuffer, send, sameOrigin, handle } = require('../lib/http');

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
  if (!auth.isAdmin(req)) return send(res, 401, { ok: false, error: 'unauthorized' });
  if (!storage.isConfigured()) return send(res, 503, { ok: false, error: 'storage_not_configured' });
  const buffer = await readBuffer(req, 3.5 * 1024 * 1024);
  if (!isJpeg(buffer)) return send(res, 400, { ok: false, error: 'invalid_image' });
  const url = await storage.putImage(buffer);
  send(res, 200, { ok: true, url });
});
