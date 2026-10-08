// POST /api/track — nhận sự kiện từ trang (lật trang, nghe chuyện, đóng dấu, quay thưởng).
// Mỗi người được nhận diện bằng vid (mã ngẫu nhiên của trình duyệt), gắn thêm mã thẻ khi đã nhận thẻ.
// Dữ liệu Redis:
//   u:{vid}   hash   pid, name, flips (số lần lật), last (trang đang xem), first, seen, checkin, claimed, prize{st}
//   pg:{vid}  set    các trang đã xem
//   ch:{vid}  set    các chương đã nghe xong
//   st:{vid}  set    các trạm đã đóng dấu
//   users     zset   vid theo thời điểm hoạt động gần nhất
const { configured, redis } = require('./_store');

const MAX_EVENTS = 200;
const PAGE_COUNT = 22;
const PRIZES = new Set(['sticker', 'keychain', 'none']);

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (!configured()) return res.status(503).json({ configured: false });

  const body = readBody(req);
  const vid = body && String(body.vid || '');
  if (!/^[A-Za-z0-9-]{8,40}$/.test(vid)) return res.status(400).json({ error: 'vid' });
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const pid = /^(TAO|OFF)-[A-Z0-9]{6}$/.test(body.pid || '') ? body.pid : null;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 24) : '';
  const now = Date.now();
  const key = `u:${vid}`;

  const cmds = [
    ['HSETNX', key, 'first', String(now)],
    ['HSET', key, 'seen', String(now)],
    ['ZADD', 'users', String(now), vid]
  ];
  if (pid) cmds.push(['HSET', key, 'pid', pid], ['HSET', 'pid2vid', pid, vid]);
  if (name) cmds.push(['HSET', key, 'name', name]);

  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    const n = Number.isInteger(e.p) ? e.p : Number.isInteger(e.ch) ? e.ch : Number.isInteger(e.st) ? e.st : null;
    if (e.t === 'flip' && n !== null && n >= 0 && n < PAGE_COUNT) {
      cmds.push(['HINCRBY', key, 'flips', '1'], ['HSET', key, 'last', String(n)], ['SADD', `pg:${vid}`, String(n)]);
    } else if (e.t === 'listen' && n >= 1 && n <= 4) {
      cmds.push(['SADD', `ch:${vid}`, String(n)]);
    } else if (e.t === 'stamp' && n >= 1 && n <= 4) {
      cmds.push(['SADD', `st:${vid}`, String(n)]);
    } else if (e.t === 'spin' && n >= 1 && n <= 4 && PRIZES.has(e.prize)) {
      cmds.push(['HSET', key, `prize${n}`, e.prize]);
    } else if (e.t === 'checkin') {
      cmds.push(['HSETNX', key, 'checkin', String(now)]);
    } else if (e.t === 'claim') {
      cmds.push(['HSET', key, 'claimed', '1']);
    }
  }

  try {
    await redis(cmds);
    return res.status(204).end();
  } catch (err) {
    return res.status(502).json({ error: 'store' });
  }
};
