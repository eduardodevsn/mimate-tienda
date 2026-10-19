const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dev';

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMG_DIR = path.join(__dirname, '.data', 'img');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serve(res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.statusCode = 404;
    res.end('No encontrado');
    return;
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.indexOf('/api/') === 0) {
    const name = pathname.slice(5).replace(/[^a-z]/g, '');
    const file = path.join(__dirname, 'api', name + '.js');
    if (!fs.existsSync(file)) {
      res.statusCode = 404;
      res.end('No encontrado');
      return;
    }
    require(file)(req, res);
    return;
  }
  if (pathname.indexOf('/dev-img/') === 0) {
    serve(res, path.join(IMG_DIR, path.basename(pathname)));
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  const full = path.join(PUBLIC_DIR, path.normalize(pathname));
  if (full.indexOf(PUBLIC_DIR) !== 0) {
    res.statusCode = 403;
    res.end('Prohibido');
    return;
  }
  serve(res, full);
}).listen(PORT, () => {
  console.log('Tienda en http://localhost:' + PORT + '  |  Admin en http://localhost:' + PORT + '/admin  |  Contraseña local: ' + process.env.ADMIN_PASSWORD);
});
