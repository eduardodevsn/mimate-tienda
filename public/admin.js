(() => {
const MAX_PHOTOS = 4;
const MAX_SIDE = 900;
const DEFAULT_SETTINGS = {
  whatsapp: '595971280309',
  instagram: 'https://www.instagram.com/mimate_pyy/',
  tiktok: 'https://www.tiktok.com/@_angieealcarazz',
  announce: 'Tienda online · Exclusivo de Shein · Pedidos por WhatsApp',
  delivery: '',
  payment: '',
  pickup: ''
};
const CATEGORY_HINTS = ['Ropa', 'Accesorios', 'Calzado', 'Otros'];

const state = {
  view: 'boot',
  tab: 'productos',
  session: null,
  catalog: null,
  editing: null,
  confirmDelete: null,
  busy: false,
  error: ''
};

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  const p = props || {};
  for (const k in p) {
    const v = p[k];
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => {
    if (c == null || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return el;
}
const $ = s => document.querySelector(s);

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
}

function fmtPrice(n) { return 'Gs. ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function newId() {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return 'p' + Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
}
function safeImg(u) { return /^(https:\/\/|\/dev-img\/)/.test(String(u || '')) ? u : ''; }

class ApiError extends Error {
  constructor(status, code) { super(code || ('http_' + status)); this.status = status; this.code = code || ''; }
}
async function api(path, opts) {
  const o = Object.assign({ credentials: 'same-origin' }, opts || {});
  let res;
  try { res = await fetch(path, o); } catch (e) { throw new ApiError(0, 'network'); }
  let body = null;
  try { body = await res.json(); } catch (e) {}
  if (!res.ok || !body || body.ok === false) throw new ApiError(res.status, body && body.error);
  return body;
}
function postJson(path, data) {
  return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
function explain(e) {
  if (!(e instanceof ApiError)) return 'Ocurrió un error inesperado. Probá de nuevo.';
  if (e.status === 401 && e.code === 'wrong_password') return 'Contraseña incorrecta.';
  if (e.status === 401) return 'Tu sesión venció. Ingresá de nuevo.';
  if (e.status === 429) return 'Demasiados intentos. Esperá unos minutos y probá otra vez.';
  if (e.code === 'storage_not_configured') return 'Falta conectar el almacenamiento (Blob) en Vercel. Revisá el README.';
  if (e.code === 'not_configured') return 'Falta definir ADMIN_PASSWORD en Vercel. Revisá el README.';
  if (e.code === 'network') return 'No hay conexión. Revisá internet y probá de nuevo.';
  if (e.code === 'invalid_image') return 'Una de las fotos no es válida. Probá con otra.';
  if (e.status === 413) return 'La foto es demasiado pesada.';
  if (e.status === 400) return 'Hay datos que no son válidos. Revisá el formulario.';
  return 'No se pudo completar la acción (' + (e.code || e.status) + ').';
}

async function loadCatalog() {
  const body = await api('/api/catalog?fresh=1');
  const c = body.catalog || {};
  state.catalog = {
    settings: Object.assign({}, DEFAULT_SETTINGS, c.settings || {}),
    products: Array.isArray(c.products) ? c.products : []
  };
}

async function persist(next) {
  const body = await postJson('/api/save', next);
  const c = body.catalog || next;
  state.catalog = {
    settings: Object.assign({}, DEFAULT_SETTINGS, c.settings || {}),
    products: Array.isArray(c.products) ? c.products : []
  };
}

async function boot() {
  try {
    const s = await api('/api/session');
    state.session = s;
    if (s.admin) {
      await loadCatalog();
      state.view = 'list';
    } else {
      state.view = 'login';
    }
  } catch (e) {
    state.view = 'fatal';
    state.error = explain(e);
  }
  render();
}

function render() {
  const root = $('#root');
  const v = state.view;
  let node;
  if (v === 'boot') node = h('div', { class: 'login' }, h('p', null, 'Cargando…'));
  else if (v === 'fatal') node = fatalView();
  else if (v === 'login') node = loginView();
  else if (v === 'form') node = shell(formView());
  else node = shell(state.tab === 'ajustes' ? settingsView() : listView());
  root.replaceChildren(node);
}

function fatalView() {
  return h('div', { class: 'login' }, h('div', { class: 'panel' },
    h('h1', null, 'No se pudo abrir'),
    h('p', { class: 'notice', role: 'alert' }, state.error),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { state.view = 'boot'; render(); boot(); } }, 'Reintentar')));
}

function loginView() {
  const s = state.session || {};
  const err = h('p', { class: 'err', role: 'alert' });
  const input = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', required: true, 'aria-describedby': 'pw-err' });
  err.id = 'pw-err';
  const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Entrar');
  const form = h('form', { class: 'form', onsubmit: async e => {
    e.preventDefault();
    if (!input.value) { err.textContent = 'Escribí tu contraseña.'; input.focus(); return; }
    btn.disabled = true;
    err.textContent = '';
    try {
      await postJson('/api/login', { password: input.value });
      const sess = await api('/api/session');
      state.session = sess;
      await loadCatalog();
      state.view = 'list';
      state.tab = 'productos';
      render();
    } catch (ex) {
      err.textContent = explain(ex);
      btn.disabled = false;
      input.select();
    }
  } },
    h('div', { class: 'field' }, h('label', { for: 'pw' }, 'Contraseña'), input),
    err,
    btn);
  return h('div', { class: 'login' }, h('div', { class: 'panel' },
    h('h1', null, 'Administración'),
    h('p', { class: 'fine' }, 'Solo para la dueña de la tienda.'),
    s.passwordConfigured === false && h('p', { class: 'notice', role: 'alert' }, 'Todavía no se definió ADMIN_PASSWORD en Vercel. Revisá el README.'),
    s.passwordConfigured !== false && s.storageConfigured === false && h('p', { class: 'notice', role: 'alert' }, 'Falta conectar el almacenamiento (Blob) en Vercel. Podés entrar, pero no vas a poder guardar hasta conectarlo.'),
    form,
    h('a', { class: 'link-btn', href: '/' }, 'Volver a la tienda')));
}

function shell(content) {
  const inForm = state.view === 'form';
  return h('div', null,
    h('header', { class: 'adm-bar' }, h('div', { class: 'wrap' },
      h('span', { class: 'ftr-name' }, 'Mimate.py · Admin'),
      h('div', { class: 'row' },
        h('a', { class: 'btn btn-ghost btn-sm', href: '/', target: '_blank', rel: 'noopener' }, 'Ver tienda'),
        h('button', { class: 'btn btn-soft btn-sm', type: 'button', onclick: logout }, 'Salir')))),
    h('main', { class: 'adm-main' },
      !inForm && h('div', { class: 'tabs', role: 'group', 'aria-label': 'Secciones' },
        tabBtn('productos', 'Productos'),
        tabBtn('ajustes', 'Ajustes')),
      state.session && state.session.storageConfigured === false && h('p', { class: 'notice', role: 'alert' }, 'Falta conectar el almacenamiento (Blob) en Vercel. Hasta entonces no se puede guardar.'),
      content));
}
function tabBtn(id, label) {
  return h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.tab === id), onclick: () => { state.tab = id; state.confirmDelete = null; render(); } }, label);
}

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
  state.view = 'login';
  state.catalog = null;
  state.session = Object.assign({}, state.session, { admin: false });
  render();
}

function handleFail(e) {
  if (e instanceof ApiError && e.status === 401 && e.code !== 'wrong_password') {
    state.view = 'login';
    render();
  }
  toast(explain(e));
}

function listView() {
  const products = state.catalog.products;
  const sold = products.filter(p => p.status === 'sold').length;
  return h('div', { class: 'panel' },
    h('div', { class: 'adm-actions' },
      h('div', null, h('h1', null, 'Productos'), h('span', { class: 'adm-count' }, products.length + (products.length === 1 ? ' producto' : ' productos') + (sold ? ' · ' + sold + ' agotado' + (sold === 1 ? '' : 's') : ''))),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => startForm(null) }, 'Subir producto')),
    products.length
      ? h('ul', { class: 'plist' }, products.map(rowFor))
      : h('p', { class: 'fine' }, 'Todavía no hay productos. Tocá “Subir producto” para cargar el primero.'));
}

function rowFor(p) {
  const src = p.photos && p.photos[0] ? safeImg(p.photos[0]) : '';
  const sold = p.status === 'sold';
  const asking = state.confirmDelete === p.id;
  return h('li', { class: 'prow' },
    src ? h('img', { src, alt: '' }) : h('div', { class: 'ph' }),
    h('div', null,
      h('h3', null, p.name),
      h('div', { class: 'meta' }, fmtPrice(p.price) + (p.category ? ' · ' + p.category : '') + ' · ' + (p.photos ? p.photos.length : 0) + ' foto' + (p.photos && p.photos.length === 1 ? '' : 's')),
      h('span', { class: 'status' + (sold ? ' sold' : '') }, sold ? 'Agotado' : 'Disponible'),
      asking
        ? h('div', { class: 'acts' },
            h('span', { class: 'err' }, '¿Borrar “' + p.name + '”?'),
            h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => removeProduct(p) }, 'Sí, borrar'),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { state.confirmDelete = null; render(); } }, 'Cancelar'))
        : h('div', { class: 'acts' },
            h('button', { class: 'btn btn-soft btn-sm', type: 'button', onclick: () => startForm(p) }, 'Editar'),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => toggleSold(p) }, sold ? 'Marcar disponible' : 'Marcar agotado'),
            h('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => { state.confirmDelete = p.id; render(); } }, 'Borrar'))));
}

async function toggleSold(p) {
  const next = {
    settings: state.catalog.settings,
    products: state.catalog.products.map(x => x.id === p.id ? Object.assign({}, x, { status: x.status === 'sold' ? 'available' : 'sold' }) : x)
  };
  try {
    await persist(next);
    toast('Listo');
    render();
  } catch (e) { handleFail(e); }
}

async function removeProduct(p) {
  const next = { settings: state.catalog.settings, products: state.catalog.products.filter(x => x.id !== p.id) };
  try {
    await persist(next);
    state.confirmDelete = null;
    toast('Producto borrado');
    render();
  } catch (e) { handleFail(e); }
}

function startForm(p) {
  state.editing = p
    ? {
        id: p.id, name: p.name, price: String(p.price), category: p.category || '', description: p.description || '',
        variants: (p.variants || []).join(', '), status: p.status || 'available', isNew: !!p.isNew, createdAt: p.createdAt,
        photos: (p.photos || []).map(url => ({ url }))
      }
    : { id: newId(), name: '', price: '', category: '', description: '', variants: '', status: 'available', isNew: true, createdAt: null, photos: [] };
  state.view = 'form';
  state.error = '';
  render();
  window.scrollTo(0, 0);
}

function cancelForm() {
  state.editing.photos.forEach(ph => { if (ph.preview) URL.revokeObjectURL(ph.preview); });
  state.editing = null;
  state.view = 'list';
  render();
}

function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const hh = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = hh;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, hh);
      ctx.drawImage(img, 0, 0, w, hh);
      c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

function formView() {
  const f = state.editing;
  const isEdit = !!f.createdAt;
  const errBox = h('p', { class: 'err', role: 'alert' });
  const photosBox = h('div', { class: 'photos' });
  const picker = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, id: 'file-in' });
  const addBtn = h('button', { class: 'btn btn-soft', type: 'button', onclick: () => picker.click() }, 'Agregar fotos');

  const drawPhotos = () => {
    addBtn.hidden = f.photos.length >= MAX_PHOTOS;
    photosBox.replaceChildren(...f.photos.map((ph, i) => h('div', { class: 'thumb' },
      h('img', { src: ph.preview || safeImg(ph.url), alt: 'Foto ' + (i + 1) }),
      i === 0 && h('span', { class: 'first' }, 'Principal'),
      h('div', { class: 'row' },
        i > 0 && h('button', { class: 'btn btn-soft', type: 'button', 'aria-label': 'Mover foto ' + (i + 1) + ' a la izquierda', onclick: () => { f.photos.splice(i - 1, 0, f.photos.splice(i, 1)[0]); drawPhotos(); } }, '←'),
        i < f.photos.length - 1 && h('button', { class: 'btn btn-soft', type: 'button', 'aria-label': 'Mover foto ' + (i + 1) + ' a la derecha', onclick: () => { f.photos.splice(i + 1, 0, f.photos.splice(i, 1)[0]); drawPhotos(); } }, '→'),
        h('button', { class: 'btn btn-danger', type: 'button', 'aria-label': 'Quitar foto ' + (i + 1), onclick: () => { const r = f.photos.splice(i, 1)[0]; if (r.preview) URL.revokeObjectURL(r.preview); drawPhotos(); } }, 'Quitar')))));
  };
  picker.addEventListener('change', async () => {
    const files = Array.from(picker.files || []);
    picker.value = '';
    errBox.textContent = '';
    for (const file of files) {
      if (f.photos.length >= MAX_PHOTOS) { errBox.textContent = 'Máximo ' + MAX_PHOTOS + ' fotos por producto.'; break; }
      if (!/^image\//.test(file.type)) { errBox.textContent = 'Solo se pueden subir imágenes.'; continue; }
      try {
        const blob = await fileToJpeg(file);
        f.photos.push({ blob, preview: URL.createObjectURL(blob) });
      } catch (e) {
        errBox.textContent = 'No se pudo leer una de las fotos. Probá con otra.';
      }
    }
    drawPhotos();
  });

  const bind = key => e => { f[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; };
  const saveBtn = h('button', { class: 'btn btn-primary', type: 'submit' }, isEdit ? 'Guardar cambios' : 'Publicar producto');
  const cancelBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: cancelForm }, 'Cancelar');

  const form = h('form', { class: 'form', novalidate: true, onsubmit: async e => {
    e.preventDefault();
    errBox.textContent = '';
    const name = f.name.trim();
    const price = Number(String(f.price).replace(/[^\d]/g, ''));
    if (!name) { errBox.textContent = 'Poné el nombre del producto.'; $('#f-name').focus(); return; }
    if (!Number.isInteger(price) || price < 1) { errBox.textContent = 'Poné un precio válido, solo números.'; $('#f-price').focus(); return; }
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    addBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';
    try {
      const urls = [];
      for (const ph of f.photos) {
        if (ph.url) { urls.push(ph.url); continue; }
        const up = await api('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: ph.blob });
        ph.url = up.url;
        urls.push(up.url);
      }
      const product = {
        id: f.id,
        name,
        price,
        category: f.category.trim() || 'Otros',
        description: f.description.trim(),
        variants: f.variants.split(',').map(x => x.trim()).filter(Boolean),
        status: f.status,
        isNew: f.isNew,
        photos: urls,
        createdAt: f.createdAt || new Date().toISOString()
      };
      const exists = state.catalog.products.some(p => p.id === f.id);
      const products = exists
        ? state.catalog.products.map(p => p.id === f.id ? product : p)
        : [product].concat(state.catalog.products);
      await persist({ settings: state.catalog.settings, products });
      f.photos.forEach(ph => { if (ph.preview) URL.revokeObjectURL(ph.preview); });
      state.editing = null;
      state.view = 'list';
      toast(isEdit ? 'Cambios guardados' : 'Producto publicado');
      render();
      window.scrollTo(0, 0);
    } catch (ex) {
      if (ex instanceof ApiError && ex.status === 401 && ex.code !== 'wrong_password') {
        state.view = 'login';
        render();
        toast(explain(ex));
        return;
      }
      errBox.textContent = explain(ex);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      addBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Publicar producto';
    }
  } },
    h('div', { class: 'field' }, h('label', { for: 'f-name' }, 'Nombre'), h('input', { type: 'text', id: 'f-name', maxlength: '80', value: f.name, oninput: bind('name'), autocomplete: 'off' })),
    h('div', { class: 'field' }, h('label', { for: 'f-price' }, 'Precio (Gs.)'), h('input', { type: 'text', inputmode: 'numeric', id: 'f-price', value: f.price, oninput: bind('price'), autocomplete: 'off' }), h('small', null, 'Solo números, sin puntos. Ej: 150000')),
    h('div', { class: 'field' }, h('label', { for: 'f-cat' }, 'Categoría'), h('input', { type: 'text', id: 'f-cat', maxlength: '30', list: 'cats', value: f.category, oninput: bind('category'), autocomplete: 'off' }),
      h('datalist', { id: 'cats' }, Array.from(new Set(CATEGORY_HINTS.concat(state.catalog.products.map(p => p.category).filter(Boolean)))).map(c => h('option', { value: c })))),
    h('div', { class: 'field' }, h('label', { for: 'f-desc' }, 'Descripción'), h('textarea', { id: 'f-desc', maxlength: '800', value: f.description, oninput: bind('description') })),
    h('div', { class: 'field' }, h('label', { for: 'f-vars' }, 'Talles o variantes'), h('input', { type: 'text', id: 'f-vars', value: f.variants, oninput: bind('variants'), autocomplete: 'off' }), h('small', null, 'Separados por coma. Ej: S, M, L. Dejalo vacío si no tiene.')),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Fotos (hasta ' + MAX_PHOTOS + ')'), photosBox, h('div', null, addBtn), picker, h('small', null, 'La primera es la principal. Se achican solas para que cargue rápido.')),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.isNew, onchange: bind('isNew') }), 'Mostrar etiqueta “Nuevo”'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.status === 'sold', onchange: e => { f.status = e.target.checked ? 'sold' : 'available'; } }), 'Agotado'),
    errBox,
    h('div', { class: 'sticky-actions' }, saveBtn, cancelBtn));
  drawPhotos();
  return h('div', { class: 'panel' }, h('h1', null, isEdit ? 'Editar producto' : 'Nuevo producto'), form);
}

function settingsView() {
  const s = Object.assign({}, state.catalog.settings);
  const errBox = h('p', { class: 'err', role: 'alert' });
  const saveBtn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar ajustes');
  const field = (key, label, hint, kind, extra) => {
    const tag = kind === 'area' ? 'textarea' : 'input';
    const props = Object.assign({ id: 's-' + key, value: s[key] || '', oninput: e => { s[key] = e.target.value; }, autocomplete: 'off' }, kind === 'area' ? { maxlength: '400' } : { type: kind || 'text' }, extra || {});
    return h('div', { class: 'field' }, h('label', { for: 's-' + key }, label), h(tag, props), hint && h('small', null, hint));
  };
  const form = h('form', { class: 'form', novalidate: true, onsubmit: async e => {
    e.preventDefault();
    errBox.textContent = '';
    const wa = String(s.whatsapp || '').replace(/\D/g, '');
    if (wa.length < 8 || wa.length > 15) { errBox.textContent = 'El WhatsApp debe tener entre 8 y 15 números, con código de país. Ej: 595971280309'; $('#s-whatsapp').focus(); return; }
    for (const k of ['instagram', 'tiktok']) {
      const v = String(s[k] || '').trim();
      if (v && !/^https:\/\//i.test(v)) { errBox.textContent = 'Los links de redes tienen que empezar con https://'; $('#s-' + k).focus(); return; }
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';
    try {
      await persist({
        settings: Object.assign({}, s, { whatsapp: wa, instagram: String(s.instagram || '').trim(), tiktok: String(s.tiktok || '').trim() }),
        products: state.catalog.products
      });
      toast('Ajustes guardados');
      render();
    } catch (ex) {
      if (ex instanceof ApiError && ex.status === 401 && ex.code !== 'wrong_password') { state.view = 'login'; render(); toast(explain(ex)); return; }
      errBox.textContent = explain(ex);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar ajustes';
    }
  } },
    field('whatsapp', 'WhatsApp para pedidos', 'Con código de país y sin signos. Ej: 595971280309', 'tel', { inputmode: 'numeric' }),
    field('announce', 'Mensaje de la barra superior', 'Dejalo vacío para ocultarla.', 'text', { maxlength: '140' }),
    field('instagram', 'Link de Instagram', null, 'url'),
    field('tiktok', 'Link de TikTok', null, 'url'),
    field('delivery', 'Tiempos de entrega', 'Aparece en la tienda si lo completás.', 'area'),
    field('payment', 'Formas de pago', null, 'area'),
    field('pickup', 'Retiro y envíos', null, 'area'),
    errBox,
    h('div', { class: 'sticky-actions' }, saveBtn));
  return h('div', { class: 'panel' }, h('h1', null, 'Ajustes'), form);
}

boot();
})();
