const auth = require('../lib/auth');
const storage = require('../lib/storage');
const { cleanCatalog, normalizeStored } = require('../lib/validate');
const { readJson, send, sameOrigin, handle } = require('../lib/http');

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
  if (!auth.isAdmin(req)) return send(res, 401, { ok: false, error: 'unauthorized' });
  if (!storage.isConfigured()) return send(res, 503, { ok: false, error: 'storage_not_configured' });
  const body = await readJson(req, 1024 * 1024);
  const clean = cleanCatalog(body, storage.isOwnImage);
  const previous = normalizeStored(await storage.readCatalog());
  const keep = new Set();
  clean.products.forEach(p => p.photos.forEach(url => keep.add(url)));
  const removed = [];
  previous.products.forEach(p => (p.photos || []).forEach(url => { if (!keep.has(url)) removed.push(url); }));
  await storage.writeCatalog(clean);
  try {
    await storage.deleteImages(removed);
  } catch (e) {
    console.error(e);
  }
  send(res, 200, { ok: true, catalog: clean });
});
