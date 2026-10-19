const auth = require('../lib/auth');
const storage = require('../lib/storage');
const { send, handle } = require('../lib/http');

module.exports = handle(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method_not_allowed' });
  send(res, 200, {
    ok: true,
    admin: auth.isAdmin(req),
    passwordConfigured: auth.isConfigured(),
    storageConfigured: storage.isConfigured()
  });
});
