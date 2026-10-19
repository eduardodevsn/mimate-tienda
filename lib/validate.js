const MAX_PRODUCTS = 300;
const MAX_PHOTOS = 4;

const DEFAULT_SETTINGS = {
  whatsapp: '595971280309',
  instagram: 'https://www.instagram.com/mimate_pyy/',
  tiktok: 'https://www.tiktok.com/@_angieealcarazz',
  announce: 'Tienda online · Exclusivo de Shein · Pedidos por WhatsApp',
  delivery: '',
  payment: '',
  pickup: ''
};

function fail(message) {
  return Object.assign(new Error(message), { status: 400, code: message });
}

function text(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function httpsUrl(value) {
  const v = text(value, 300);
  if (!v) return '';
  if (!/^https:\/\//i.test(v)) throw fail('invalid_link');
  return v;
}

function cleanSettings(input) {
  const s = input && typeof input === 'object' ? input : {};
  const whatsapp = String(s.whatsapp || '').replace(/\D/g, '');
  if (whatsapp.length < 8 || whatsapp.length > 15) throw fail('invalid_whatsapp');
  return {
    whatsapp,
    instagram: httpsUrl(s.instagram),
    tiktok: httpsUrl(s.tiktok),
    announce: text(s.announce, 140),
    delivery: text(s.delivery, 500),
    payment: text(s.payment, 500),
    pickup: text(s.pickup, 500)
  };
}

function cleanProduct(input, isOwnImage) {
  const p = input && typeof input === 'object' ? input : {};
  const id = String(p.id || '');
  if (!/^[a-zA-Z0-9_-]{4,40}$/.test(id)) throw fail('invalid_product');
  const name = text(p.name, 80);
  if (!name) throw fail('invalid_name');
  const price = Math.round(Number(p.price));
  if (!Number.isFinite(price) || price < 1 || price > 99999999) throw fail('invalid_price');
  const variants = [];
  (Array.isArray(p.variants) ? p.variants : []).forEach(v => {
    const t = text(v, 24);
    if (t && variants.indexOf(t) < 0 && variants.length < 12) variants.push(t);
  });
  const photos = [];
  (Array.isArray(p.photos) ? p.photos : []).forEach(u => {
    if (typeof u === 'string' && isOwnImage(u) && photos.length < MAX_PHOTOS) photos.push(u);
  });
  return {
    id,
    name,
    price,
    category: text(p.category, 30) || 'Otros',
    description: text(p.description, 800),
    variants,
    status: p.status === 'sold' ? 'sold' : 'available',
    isNew: !!p.isNew,
    photos,
    createdAt: Number.isFinite(Number(p.createdAt)) && Number(p.createdAt) > 0 ? Number(p.createdAt) : Date.now()
  };
}

function cleanCatalog(input, isOwnImage) {
  if (!input || typeof input !== 'object') throw fail('invalid_catalog');
  const list = Array.isArray(input.products) ? input.products : [];
  if (list.length > MAX_PRODUCTS) throw fail('too_many_products');
  const seen = new Set();
  const products = list.map(p => cleanProduct(p, isOwnImage));
  products.forEach(p => {
    if (seen.has(p.id)) throw fail('duplicate_product');
    seen.add(p.id);
  });
  return { v: 1, settings: cleanSettings(input.settings), products };
}

function defaultCatalog() {
  return { v: 1, settings: Object.assign({}, DEFAULT_SETTINGS), products: [] };
}

function normalizeStored(raw) {
  if (!raw || typeof raw !== 'object') return defaultCatalog();
  return {
    v: 1,
    settings: Object.assign({}, DEFAULT_SETTINGS, raw.settings || {}),
    products: Array.isArray(raw.products) ? raw.products : []
  };
}

function isJpeg(buf) {
  return Buffer.isBuffer(buf) && buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

module.exports = { cleanCatalog, defaultCatalog, normalizeStored, isJpeg, MAX_PHOTOS };
