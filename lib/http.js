const MAX_BODY = 1024 * 1024;

function readStream(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readBuffer(req, limit) {
  const max = limit || MAX_BODY;
  const pre = req.body;
  if (Buffer.isBuffer(pre)) {
    if (pre.length > max) throw Object.assign(new Error('too_large'), { status: 413 });
    return pre;
  }
  if (typeof pre === 'string') return Buffer.from(pre);
  if (pre && typeof pre === 'object') return Buffer.from(JSON.stringify(pre));
  return readStream(req, max);
}

async function readJson(req, limit) {
  const pre = req.body;
  if (pre && typeof pre === 'object' && !Buffer.isBuffer(pre)) return pre;
  const buf = await readBuffer(req, limit);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch (e) {
    throw Object.assign(new Error('bad_json'), { status: 400 });
  }
}

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const extra = headers || {};
  Object.keys(extra).forEach(k => res.setHeader(k, extra[k]));
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      const status = e && e.status ? e.status : 500;
      const code = e && e.code && typeof e.code === 'string' ? e.code : (e && e.message) || 'error';
      if (status >= 500) console.error(e);
      send(res, status, { ok: false, error: status >= 500 ? 'server_error' : code });
    }
  };
}

module.exports = { readBuffer, readJson, send, parseCookies, sameOrigin, clientIp, handle };
