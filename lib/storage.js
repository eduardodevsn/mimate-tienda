const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CATALOG_PATH = 'catalog.json';
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const DEV_DIR = path.join(__dirname, '..', '.data');

function randomName() {
  return Date.now().toString(36) + crypto.randomBytes(5).toString('hex');
}

function isConfigured() {
  return useBlob || !process.env.VERCEL;
}

function isOwnImage(url) {
  if (typeof url !== 'string') return false;
  if (useBlob) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com') && u.pathname.indexOf('/fotos/') === 0;
    } catch (e) {
      return false;
    }
  }
  return /^\/dev-img\/[a-z0-9]+\.jpg$/.test(url);
}

async function readCatalog() {
  if (useBlob) {
    const { get } = require('@vercel/blob');
    let result;
    try {
      result = await get(CATALOG_PATH, { access: 'public', useCache: false });
    } catch (e) {
      if (e && /not.?found/i.test(String(e.name || '') + String(e.message || ''))) return null;
      throw e;
    }
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text());
  }
  const file = path.join(DEV_DIR, CATALOG_PATH);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function writeCatalog(catalog) {
  const body = JSON.stringify(catalog);
  if (useBlob) {
    const { put } = require('@vercel/blob');
    await put(CATALOG_PATH, body, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60
    });
    return;
  }
  fs.mkdirSync(DEV_DIR, { recursive: true });
  fs.writeFileSync(path.join(DEV_DIR, CATALOG_PATH), body);
}

async function putImage(buffer) {
  const name = randomName() + '.jpg';
  if (useBlob) {
    const { put } = require('@vercel/blob');
    const result = await put('fotos/' + name, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365
    });
    return result.url;
  }
  fs.mkdirSync(path.join(DEV_DIR, 'img'), { recursive: true });
  fs.writeFileSync(path.join(DEV_DIR, 'img', name), buffer);
  return '/dev-img/' + name;
}

async function deleteImages(urls) {
  const own = (urls || []).filter(isOwnImage);
  if (!own.length) return;
  if (useBlob) {
    const { del } = require('@vercel/blob');
    await del(own);
    return;
  }
  own.forEach(u => {
    const file = path.join(DEV_DIR, 'img', path.basename(u));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
}

module.exports = { isConfigured, isOwnImage, readCatalog, writeCatalog, putImage, deleteImages, DEV_DIR };
