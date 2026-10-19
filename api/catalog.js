const storage = require('../lib/storage');
const { defaultCatalog, normalizeStored } = require('../lib/validate');
const { isAdmin } = require('../lib/auth');
const { send, handle } = require('../lib/http');

module.exports = handle(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  const configured = storage.isConfigured();
  let catalog = defaultCatalog();
  if (configured) {
    const stored = await storage.readCatalog();
    if (stored) catalog = normalizeStored(stored);
  }
  const fresh = isAdmin(req) && /[?&]fresh=1/.test(req.url || '');
  send(res, 200, { ok: true, configured, catalog }, {
    'Cache-Control': fresh ? 'no-store' : 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': fresh ? 'no-store' : 'max-age=20, stale-while-revalidate=120'
  });
});
