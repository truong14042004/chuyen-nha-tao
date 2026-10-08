/**
 * Máy chủ chạy thử ở máy, có đủ API (/api/*) như trên Vercel và một Redis giả lập trong bộ nhớ.
 * Dùng để thử trọn luồng: tạo thẻ → staff quét QR đóng dấu → vòng quay → trao quà → trang quản trị.
 *   npm run dev:full      rồi mở http://localhost:5174
 * Mật khẩu thử: admin = admin123, staff = staff123 (đặt ADMIN_KEY / STAFF_KEY để đổi).
 * Dữ liệu mất khi tắt máy chủ. Không dùng file này khi đưa lên Vercel.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5174);
const ROOT = __dirname;
process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
process.env.STAFF_KEY = process.env.STAFF_KEY || 'staff123';

// Redis giả lập: chỉ những lệnh dự án dùng
if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
  process.env.KV_REST_API_URL = 'http://memory.redis';
  process.env.KV_REST_API_TOKEN = 'local';
  const db = { h: {}, s: {}, z: {}, k: {} };
  const run = ([cmd, k, ...a]) => {
    switch (cmd) {
      case 'HSET': { const h = (db.h[k] = db.h[k] || {}); for (let i = 0; i < a.length; i += 2) h[a[i]] = a[i + 1]; return 1; }
      case 'HSETNX': { const h = (db.h[k] = db.h[k] || {}); if (a[0] in h) return 0; h[a[0]] = a[1]; return 1; }
      case 'HINCRBY': { const h = (db.h[k] = db.h[k] || {}); h[a[0]] = String(Number(h[a[0]] || 0) + Number(a[1])); return Number(h[a[0]]); }
      case 'HGETALL': return Object.entries(db.h[k] || {}).flat();
      case 'SADD': (db.s[k] = db.s[k] || new Set()).add(a[0]); return 1;
      case 'SMEMBERS': return [...(db.s[k] || [])];
      case 'ZADD': (db.z[k] = db.z[k] || {})[a[1]] = Number(a[0]); return 1;
      case 'ZREVRANGE': return Object.entries(db.z[k] || {}).sort((x, y) => y[1] - x[1]).slice(Number(a[0]), Number(a[1]) + 1).map((x) => x[0]);
      case 'GET': return db.k[k] ?? null;
      case 'INCR': db.k[k] = String(Number(db.k[k] || 0) + 1); return Number(db.k[k]);
      case 'EXPIRE': setTimeout(() => { delete db.k[k]; }, Number(a[0]) * 1000).unref(); return 1;
      default: throw new Error('Lệnh Redis chưa giả lập: ' + cmd);
    }
  };
  const realFetch = global.fetch;
  global.fetch = async (url, opt) => {
    if (!String(url).startsWith('http://memory.redis')) return realFetch(url, opt);
    const out = JSON.parse(opt.body).map((c) => ({ result: run(c) }));
    return { ok: true, json: async () => out };
  };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.stl': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // API: giống Vercel serverless (req.query, req.body, res.status().json())
  const m = url.pathname.match(/^\/api\/([a-z]+)$/);
  if (m && fs.existsSync(path.join(ROOT, 'api', m[1] + '.js'))) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    req.query = Object.fromEntries(url.searchParams);
    try { req.body = raw ? JSON.parse(raw) : undefined; } catch (e) { req.body = raw; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(b)); return res; };
    try { await require(path.join(ROOT, 'api', m[1] + '.js'))(req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end('error'); }
    return;
  }
  // File tĩnh
  let file = path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(ROOT) || /[\\/](api|node_modules|\.git)[\\/]/.test(file.slice(ROOT.length))) { res.statusCode = 403; return res.end(); }
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Chuyện Nhà Táo (có API) chạy ở http://localhost:${PORT}`);
  console.log(`  Trang staff:  http://localhost:${PORT}/staff.html  (mật khẩu ${process.env.STAFF_KEY})`);
  console.log(`  Quản trị:     http://localhost:${PORT}/admin.html  (mật khẩu ${process.env.ADMIN_KEY})`);
});
