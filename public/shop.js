(() => {
const CART_KEY = 'mimate-cart-v1';
const DEFAULT_SETTINGS = {
  whatsapp: '595971280309',
  instagram: 'https://www.instagram.com/mimate_pyy/',
  tiktok: 'https://www.tiktok.com/@_angieealcarazz',
  announce: 'Tienda online · Exclusivo de Shein · Pedidos por WhatsApp',
  delivery: '',
  payment: '',
  pickup: ''
};

const state = {
  data: { settings: Object.assign({}, DEFAULT_SETTINGS), products: [] },
  status: 'loading',
  cat: 'Todo',
  q: '',
  cart: loadCart(),
  note: ''
};
const refs = {};

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  const p = props || {};
  for (const k in p) {
    const v = p[k];
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
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
const $ = (s, r) => (r || document).querySelector(s);

const ICONS = {
  bag: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.5A8.4 8.4 0 1 1 21 11.5z"/>'
};
const HEART = 'M12 21s-7.5-4.6-9.5-9.3C1.2 8.5 3 5 6.4 5c2 0 3.6 1.1 5.6 3.2C14 6.1 15.6 5 17.6 5 21 5 22.8 8.5 21.5 11.7 19.5 16.4 12 21 12 21z';
function icon(name, size) {
  const s = size || 20;
  const w = h('span', { class: 'ic', 'aria-hidden': 'true' });
  w.innerHTML = '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  return w;
}
function heart(size) {
  const w = h('span', { class: 'ic', 'aria-hidden': 'true' });
  w.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="currentColor"><path d="' + HEART + '"/></svg>';
  return w;
}

function fmtPrice(n) { return 'Gs. ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function digits(s) { return String(s || '').replace(/\D/g, ''); }
function fmtPhone(n) {
  const d = digits(n);
  if (d.length === 12 && d.indexOf('595') === 0) return '+595 ' + d.slice(3, 6) + ' ' + d.slice(6, 9) + ' ' + d.slice(9);
  return d ? '+' + d : '';
}
function waLink(text) {
  return 'https://wa.me/' + digits(state.data.settings.whatsapp) + (text ? '?text=' + encodeURIComponent(text) : '');
}
function safeUrl(u) { return /^https:\/\//i.test(String(u || '')) ? u : ''; }
function safeImg(u) { return /^(https:\/\/|\/dev-img\/)/.test(String(u || '')) ? u : ''; }

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
}

function loadCart() {
  try {
    const r = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(r) ? r.filter(x => x && typeof x.id === 'string' && Number.isInteger(x.qty) && x.qty > 0) : [];
  } catch (e) { return []; }
}
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) {} }
function findProduct(id) { return state.data.products.find(p => p.id === id); }
function cartLines() {
  return state.cart.map(c => ({ p: findProduct(c.id), variant: c.variant || '', qty: c.qty })).filter(l => l.p);
}
function activeLines() { return cartLines().filter(l => l.p.status !== 'sold'); }
function cartCount() { return activeLines().reduce((a, l) => a + l.qty, 0); }
function cartTotal() { return activeLines().reduce((a, l) => a + l.p.price * l.qty, 0); }
function addToCart(p, variant, qty) {
  const v = variant || '';
  const hit = state.cart.find(c => c.id === p.id && (c.variant || '') === v);
  if (hit) hit.qty = Math.min(20, hit.qty + qty);
  else state.cart.push({ id: p.id, variant: v, qty: Math.min(20, qty) });
  saveCart();
  renderHeader();
}
function setQty(id, variant, qty) {
  const i = state.cart.findIndex(c => c.id === id && (c.variant || '') === variant);
  if (i < 0) return;
  if (qty <= 0) state.cart.splice(i, 1); else state.cart[i].qty = Math.min(20, qty);
  saveCart();
  renderHeader();
}
function orderMessage() {
  const lines = activeLines();
  const out = ['Hola Mimate! Quiero hacer este pedido:', ''];
  lines.forEach(l => out.push('• ' + l.qty + ' x ' + l.p.name + (l.variant ? ' (' + l.variant + ')' : '') + ' - ' + fmtPrice(l.p.price * l.qty)));
  out.push('', 'Total: ' + fmtPrice(cartTotal()));
  if (state.note.trim()) out.push('', 'Aclaraciones: ' + state.note.trim());
  return out.join('\n');
}

function categories() {
  const seen = [];
  state.data.products.forEach(p => { if (p.category && seen.indexOf(p.category) < 0) seen.push(p.category); });
  return seen;
}
function photoOf(p) { return p.photos && p.photos[0] ? safeImg(p.photos[0]) : ''; }
function photoOrHeart(p) {
  const src = photoOf(p);
  if (src) return h('img', { src, alt: p.name, loading: 'lazy' });
  return h('div', { class: 'ph' }, heart(56));
}

const ov = { el: null, last: null, onKey: null };
function focusables(root) { return Array.from(root.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,a[href]')).filter(e => e.offsetParent !== null); }
function openOverlay(node, opts) {
  const o = opts || {};
  closeOverlay(true);
  ov.last = document.activeElement;
  const scrim = h('div', { class: 'scrim' + (o.side ? ' side' : ''), onmousedown: e => { if (e.target === scrim) closeOverlay(); } }, node);
  $('#overlays').append(scrim);
  ov.el = scrim;
  document.body.classList.add('lock');
  ov.onKey = e => {
    if (e.key === 'Escape') { closeOverlay(); return; }
    if (e.key === 'Tab') {
      const f = focusables(scrim);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', ov.onKey);
  const f = node.querySelector('[data-autofocus]') || focusables(node)[0];
  if (f) f.focus();
}
function closeOverlay(silent) {
  if (!ov.el) return;
  ov.el.remove();
  ov.el = null;
  document.removeEventListener('keydown', ov.onKey);
  document.body.classList.remove('lock');
  if (!silent && ov.last && document.contains(ov.last) && ov.last.focus) ov.last.focus();
}

function renderAll() {
  const root = $('#root');
  refs.announce = h('div', { class: 'announce' });
  refs.hdr = h('header', { class: 'hdr' });
  refs.hero = h('section', { class: 'hero', id: 'inicio' });
  refs.shop = h('section', { class: 'section alt', id: 'catalogo' });
  refs.how = h('section', { class: 'section', id: 'como-comprar' });
  refs.info = h('section', { class: 'section info', id: 'info' });
  refs.ftr = h('footer', { class: 'ftr' });
  root.replaceChildren(refs.announce, refs.hdr, h('main', null, refs.hero, refs.shop, refs.how, refs.info), refs.ftr);
  buildShop();
  renderDynamic();
  renderHow();
}

function renderDynamic() {
  renderHeader();
  renderHero();
  renderChips();
  renderGrid();
  renderInfo();
  renderFooter();
}

function renderHeader() {
  const s = state.data.settings;
  refs.announce.textContent = s.announce || '';
  refs.announce.hidden = !s.announce;
  const n = cartCount();
  const hasInfo = !!(s.delivery || s.payment || s.pickup);
  refs.hdr.replaceChildren(h('div', { class: 'wrap' },
    h('a', { class: 'logo', href: '#inicio', 'aria-label': 'Mimate.py, inicio' }, heart(32), h('span', null, 'Mimate', h('span', null, '.py'))),
    h('nav', { class: 'nav', 'aria-label': 'Secciones' },
      h('a', { href: '#catalogo' }, 'Catálogo'),
      h('a', { href: '#como-comprar' }, 'Cómo comprar'),
      hasInfo && h('a', { href: '#info' }, 'Entregas y pagos')),
    h('div', { class: 'hdr-actions' },
      h('button', { class: 'btn btn-primary btn-sm cart-btn', type: 'button', 'aria-label': 'Ver mi pedido, ' + n + ' productos', onclick: openCart }, icon('bag', 20), h('span', { class: 'btn-label' }, 'Mi pedido'), n > 0 && h('span', { class: 'badge' }, n)))));
}

function renderHero() {
  const withPhotos = state.data.products.filter(p => photoOf(p)).slice(0, 3);
  const art = withPhotos.length
    ? h('div', { class: 'collage c' + withPhotos.length + (withPhotos.length === 1 ? ' n1' : '') }, withPhotos.map((p, i) => h('img', { class: 'p' + i + (withPhotos.length === 1 ? ' n1' : ''), src: photoOf(p), alt: p.name })))
    : h('div', { class: 'hero-art', 'aria-hidden': 'true' }, heart(170));
  refs.hero.replaceChildren(h('div', { class: 'wrap' },
    h('div', { class: 'hero-copy' },
      h('span', { class: 'pill' }, 'Hello Girls'),
      h('h1', null, 'Lo que te gusta de Shein, ', h('em', null, 'elegido para vos.')),
      h('p', { class: 'lead' }, 'Mirá el catálogo, armá tu pedido y mandalo directo por WhatsApp. Sin tener que preguntar qué hay.'),
      h('div', { class: 'cta-row' },
        h('a', { class: 'btn btn-primary', href: '#catalogo' }, 'Ver catálogo'),
        h('a', { class: 'btn btn-ghost', href: waLink('Hola Mimate! Quiero consultar por una prenda.'), target: '_blank', rel: 'noopener' }, icon('chat', 20), 'Escribinos'))),
    art));
}

function buildShop() {
  refs.search = h('input', { class: 'search', type: 'search', id: 'q', placeholder: 'Buscar prenda o accesorio', 'aria-label': 'Buscar en el catálogo', oninput: e => { state.q = e.target.value; renderGrid(); } });
  refs.chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Categorías' });
  refs.grid = h('div', { class: 'grid', 'aria-live': 'polite' });
  refs.shop.replaceChildren(h('div', { class: 'wrap' },
    h('div', { class: 'section-head' }, h('h2', null, 'Catálogo'), h('p', null, 'Tocá un producto para ver las fotos, elegir talle y sumarlo a tu pedido.')),
    h('div', { class: 'toolbar' }, refs.search, refs.chips),
    refs.grid));
}

function renderChips() {
  const cats = categories();
  refs.chips.hidden = cats.length < 2;
  refs.chips.replaceChildren(...['Todo'].concat(cats).map(c => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.cat === c), onclick: () => { state.cat = c; renderChips(); renderGrid(); } }, c)));
}

function visibleProducts() {
  const q = state.q.trim().toLowerCase();
  return state.data.products.filter(p => (state.cat === 'Todo' || p.category === state.cat) && (!q || (p.name + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase().indexOf(q) >= 0));
}

function renderGrid() {
  if (state.cat !== 'Todo' && !state.data.products.some(p => p.category === state.cat)) state.cat = 'Todo';
  if (state.status === 'loading') {
    refs.grid.replaceChildren(h('div', { class: 'empty' }, h('h3', null, 'Cargando el catálogo…')));
    return;
  }
  if (state.status === 'error') {
    refs.grid.replaceChildren(h('div', { class: 'empty' },
      h('h3', null, 'No pudimos cargar el catálogo'),
      h('p', null, 'Probá recargar la página o escribinos por WhatsApp y te pasamos lo que tenemos.'),
      h('a', { class: 'btn btn-primary', href: waLink('Hola Mimate! Quiero ver el catálogo.'), target: '_blank', rel: 'noopener' }, icon('chat', 20), 'Escribir por WhatsApp')));
    return;
  }
  if (!state.data.products.length) {
    refs.grid.replaceChildren(h('div', { class: 'empty' },
      h('h3', null, 'Estamos preparando el catálogo'),
      h('p', null, 'Escribinos por WhatsApp y te mostramos lo que tenemos disponible.'),
      h('a', { class: 'btn btn-primary', href: waLink('Hola Mimate! Quiero ver el catálogo.'), target: '_blank', rel: 'noopener' }, icon('chat', 20), 'Escribir por WhatsApp')));
    return;
  }
  const list = visibleProducts();
  if (!list.length) {
    refs.grid.replaceChildren(h('div', { class: 'empty' },
      h('h3', null, 'No encontramos eso'),
      h('p', null, 'Probá con otra palabra o escribinos y lo buscamos por vos.'),
      h('a', { class: 'btn btn-ghost', href: waLink('Hola Mimate! Estoy buscando: ' + state.q), target: '_blank', rel: 'noopener' }, icon('chat', 20), 'Preguntar por WhatsApp')));
    return;
  }
  refs.grid.replaceChildren(...list.map(card));
}

function card(p) {
  const sold = p.status === 'sold';
  const hasVars = p.variants && p.variants.length;
  return h('article', { class: 'card' },
    h('button', { class: 'card-media', type: 'button', 'aria-label': 'Ver ' + p.name, onclick: () => openProduct(p) },
      photoOrHeart(p),
      sold ? h('span', { class: 'tag sold' }, 'Agotado') : (p.isNew && h('span', { class: 'tag' }, 'Nuevo'))),
    h('div', { class: 'card-body' },
      p.category && h('span', { class: 'cat' }, p.category),
      h('h3', null, p.name),
      hasVars && h('span', { class: 'vars' }, p.variants.join(' · ')),
      h('span', { class: 'price' }, fmtPrice(p.price)),
      sold
        ? h('a', { class: 'btn btn-ghost btn-sm', href: waLink('Hola Mimate! Quiero consultar si va a volver: ' + p.name), target: '_blank', rel: 'noopener' }, icon('chat', 18), 'Consultar')
        : h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => { if (hasVars) openProduct(p); else { addToCart(p, '', 1); toast('Agregado a tu pedido'); } } }, hasVars ? 'Elegir talle' : 'Agregar al pedido')));
}

function openProduct(p) {
  const vars = p.variants || [];
  const photos = (p.photos || []).map(safeImg).filter(Boolean);
  const sold = p.status === 'sold';
  let variant = '';
  let qty = 1;
  let idx = 0;
  const main = photos.length ? h('img', { class: 'm-img', src: photos[0], alt: p.name }) : h('div', { class: 'm-ph' }, heart(90));
  const thumbs = h('div', { class: 'm-thumbs' });
  const drawThumbs = () => {
    thumbs.replaceChildren(...photos.map((src, i) => h('button', { type: 'button', 'aria-label': 'Foto ' + (i + 1), 'aria-pressed': String(i === idx), onclick: () => { idx = i; main.src = photos[i]; drawThumbs(); } }, h('img', { src, alt: '' }))));
  };
  if (photos.length > 1) drawThumbs();
  const err = h('p', { class: 'err', role: 'alert' });
  const out = h('output', { 'aria-live': 'polite' }, '1');
  const chips = h('div', { class: 'vchips', role: 'group', 'aria-label': 'Talle o variante' });
  const drawChips = () => chips.replaceChildren(...vars.map(v => h('button', { class: 'vchip', type: 'button', 'aria-pressed': String(variant === v), onclick: () => { variant = v; err.textContent = ''; drawChips(); } }, v)));
  if (vars.length) drawChips();
  const step = h('div', { class: 'stepper' },
    h('button', { type: 'button', 'aria-label': 'Una menos', onclick: () => { qty = Math.max(1, qty - 1); out.textContent = qty; } }, icon('minus', 18)),
    out,
    h('button', { type: 'button', 'aria-label': 'Una más', onclick: () => { qty = Math.min(20, qty + 1); out.textContent = qty; } }, icon('plus', 18)));
  const node = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': p.name },
    h('button', { class: 'icon-btn x', type: 'button', 'aria-label': 'Cerrar', onclick: () => closeOverlay() }, icon('close', 20)),
    h('div', { class: 'm-gal' }, main, photos.length > 1 && thumbs),
    h('div', { class: 'm-info' },
      p.category && h('span', { class: 'cat' }, p.category),
      h('h2', null, p.name),
      h('span', { class: 'price' }, fmtPrice(p.price)),
      p.description && h('p', { class: 'm-desc' }, p.description),
      sold && h('p', { class: 'err' }, 'Agotado por ahora'),
      !sold && vars.length > 0 && h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Talle o variante'), chips),
      !sold && h('div', { class: 'row' }, step, h('button', { class: 'btn btn-primary', type: 'button', 'data-autofocus': '', onclick: () => {
        if (vars.length && !variant) { err.textContent = 'Elegí un talle o variante para continuar.'; return; }
        addToCart(p, variant, qty);
        closeOverlay(true);
        toast('Agregado a tu pedido');
      } }, 'Agregar al pedido')),
      err,
      h('a', { class: 'btn btn-ghost', href: waLink('Hola Mimate! Quiero consultar por: ' + p.name + ' (' + fmtPrice(p.price) + ')'), target: '_blank', rel: 'noopener' }, icon('chat', 20), 'Preguntar por WhatsApp')));
  openOverlay(node);
}

function openCart() {
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mi pedido' });
  const draw = () => {
    const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;
    const lines = cartLines();
    const live = lines.filter(l => l.p.status !== 'sold');
    const link = h('a', { class: 'btn btn-primary', href: waLink(orderMessage()), target: '_blank', rel: 'noopener', 'aria-disabled': String(!live.length) }, icon('chat', 20), 'Enviar pedido por WhatsApp');
    if (!live.length) link.removeAttribute('href');
    box.replaceChildren(
      h('div', { class: 'sheet-head' }, h('h2', null, 'Mi pedido'), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', 'data-autofocus': '', onclick: () => closeOverlay() }, icon('close', 20))),
      lines.length ? h('ul', { class: 'lines' }, lines.map(l => {
        const sold = l.p.status === 'sold';
        const k = l.p.id + '|' + l.variant;
        const src = photoOf(l.p);
        return h('li', { class: 'line' },
          src ? h('img', { src, alt: '' }) : h('div', { class: 'ph' }),
          h('div', null,
            h('h3', null, l.p.name),
            h('div', { class: 'meta' }, (l.variant ? l.variant + ' · ' : '') + fmtPrice(l.p.price) + (sold ? ' · Agotado, no se incluye' : '')),
            h('div', { class: 'ctl' },
              h('div', { class: 'stepper' },
                h('button', { type: 'button', 'data-fk': 'm' + k, 'aria-label': 'Una menos de ' + l.p.name, onclick: () => { setQty(l.p.id, l.variant, l.qty - 1); draw(); } }, icon('minus', 18)),
                h('output', null, l.qty),
                h('button', { type: 'button', 'data-fk': 'p' + k, 'aria-label': 'Una más de ' + l.p.name, onclick: () => { setQty(l.p.id, l.variant, l.qty + 1); draw(); } }, icon('plus', 18))),
              h('button', { class: 'link-btn', type: 'button', onclick: () => { setQty(l.p.id, l.variant, 0); draw(); } }, 'Quitar'))));
      })) : h('p', { class: 'fine' }, 'Tu pedido está vacío. Elegí algo del catálogo y sumalo acá.'),
      live.length > 0 && h('div', { class: 'field' }, h('label', { for: 'order-note' }, 'Aclaraciones (opcional)'), h('textarea', { class: 'note', id: 'order-note', value: state.note, placeholder: 'Colores, dirección de entrega, dudas…', oninput: e => { state.note = e.target.value; link.href = waLink(orderMessage()); } })),
      h('div', { class: 'total' }, h('span', null, 'Total'), h('span', null, fmtPrice(cartTotal()))),
      link,
      h('p', { class: 'fine' }, 'Se abre WhatsApp con tu lista lista para enviar. Coordinamos pago y entrega por el chat.'),
      lines.length > 0 && h('button', { class: 'link-btn', type: 'button', onclick: () => { state.cart = []; saveCart(); renderHeader(); draw(); } }, 'Vaciar pedido'));
    if (fk) { const again = box.querySelector('[data-fk="' + fk.replace(/"/g, '') + '"]'); if (again) again.focus(); }
  };
  draw();
  openOverlay(box, { side: true });
}

function renderHow() {
  const steps = [
    ['Elegí', 'Mirá el catálogo y sumá lo que te guste: prendas y accesorios.'],
    ['Armá tu pedido', 'Elegí talle o variante, la cantidad, y revisá el total en Mi pedido.'],
    ['Envialo por WhatsApp', 'Un toque y se abre el chat con tu lista ya escrita.'],
    ['Confirmamos', 'Te respondemos por el chat y coordinamos pago y entrega.']
  ];
  refs.how.replaceChildren(h('div', { class: 'wrap' },
    h('div', { class: 'section-head' }, h('h2', null, 'Cómo comprar')),
    h('div', { class: 'steps' }, steps.map((s, i) => h('div', { class: 'step' }, h('span', { class: 'n' }, i + 1), h('h3', null, s[0]), h('p', null, s[1]))))));
}

function renderInfo() {
  const s = state.data.settings;
  const items = [['Tiempos de entrega', s.delivery], ['Formas de pago', s.payment], ['Retiro y envíos', s.pickup]].filter(x => x[1]);
  refs.info.hidden = !items.length;
  refs.info.replaceChildren(h('div', { class: 'wrap' }, h('div', { class: 'cols' }, items.map(x => h('div', null, h('h3', null, x[0]), h('p', null, x[1]))))));
}

function renderFooter() {
  const s = state.data.settings;
  refs.ftr.replaceChildren(h('div', { class: 'wrap' },
    h('div', null, h('span', { class: 'ftr-name' }, 'Mimate.py'), h('small', null, 'By Angie Alcaraz · Tienda online')),
    h('nav', { 'aria-label': 'Contacto' },
      safeUrl(s.instagram) && h('a', { href: s.instagram, target: '_blank', rel: 'noopener' }, 'Instagram'),
      safeUrl(s.tiktok) && h('a', { href: s.tiktok, target: '_blank', rel: 'noopener' }, 'TikTok'),
      h('a', { href: waLink(''), target: '_blank', rel: 'noopener' }, 'WhatsApp ' + fmtPhone(s.whatsapp)))));
}

async function loadCatalog() {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error('http ' + res.status);
    const body = await res.json();
    const c = body.catalog || {};
    state.data = {
      settings: Object.assign({}, DEFAULT_SETTINGS, c.settings || {}),
      products: Array.isArray(c.products) ? c.products : []
    };
    state.status = 'ready';
  } catch (e) {
    state.status = 'error';
  }
  renderDynamic();
}

renderAll();
loadCatalog();
})();
