// Kho dữ liệu: Upstash Redis qua REST API (không cần cài thư viện).
// Trên Vercel: Storage → Upstash Redis (Marketplace) → Connect với project,
// Vercel tự thêm biến KV_REST_API_URL / KV_REST_API_TOKEN (hoặc UPSTASH_REDIS_REST_URL / _TOKEN).
// Tên file bắt đầu bằng "_" nên Vercel không coi đây là một đường dẫn API.
const crypto = require('crypto');

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = () => Boolean(URL && TOKEN);

// Gửi nhiều lệnh Redis trong một lần gọi (pipeline). Trả về mảng kết quả theo thứ tự.
async function redis(commands) {
  if (!commands.length) return [];
  const res = await fetch(`${URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => (r.error ? null : r.result));
}

// HGETALL qua REST trả về mảng phẳng [k1, v1, k2, v2...]
const toObject = (arr) => {
  const o = {};
  for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
};

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return null;
}

const PID_RE = /^(TAO|OFF)-[A-Z0-9]{6}$/;

// Kết quả vòng quay do máy chủ bốc lúc đóng dấu (khớp WHEEL trong app.js: sticker 45, móc khoá 15, không trúng 40)
const PRIZE_WEIGHTS = [['sticker', 45], ['keychain', 15], ['none', 40]];
function rollPrize() {
  let r = crypto.randomInt(0, 100);
  for (const [k, w] of PRIZE_WEIGHTS) { if (r < w) return k; r -= w; }
  return 'none';
}

// Thẻ ở dạng gửi cho người chơi / staff
function passView(h) {
  if (!h || !h.pid) return null;
  const by = (prefix) => Object.fromEntries([1, 2, 3, 4].filter((s) => h[prefix + s]).map((s) => [s, prefix === 'prize' ? h[prefix + s] : Number(h[prefix + s])]));
  return {
    pid: h.pid, name: h.name || '', created: Number(h.created || 0), gift: h.gift || null,
    stamps: by('st'), prizes: by('prize'), given: by('given'), claimed: h.claimed ? Number(h.claimed) : null
  };
}

// Mật khẩu: so sánh an toàn + khoá 15 phút sau 5 lần sai (theo IP)
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
function sameKey(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
async function checkKey(req, keys) {
  const ip = ipOf(req), fk = `fail:${ip}`;
  const [fails] = await redis([['GET', fk]]);
  if (Number(fails || 0) >= 5) return { ok: false, status: 429 };
  const given = req.headers['x-staff-key'] || req.headers['x-admin-key'];
  const role = keys.find(([, v]) => v && sameKey(given, v));
  if (role) return { ok: true, role: role[0] };
  await redis([['INCR', fk], ['EXPIRE', fk, '900']]);
  return { ok: false, status: 401 };
}

module.exports = { configured, redis, toObject, readBody, PID_RE, rollPrize, passView, checkKey };
