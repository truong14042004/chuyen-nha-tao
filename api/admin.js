// GET /api/admin — danh sách người tham gia cho trang quản trị (admin.html).
// Bảo vệ bằng mật khẩu ADMIN_KEY (đặt trong Vercel → Settings → Environment Variables),
// gửi qua header x-admin-key để không lộ trong đường dẫn.
const { configured, redis, toObject } = require('./_store');

const LIMIT = 2000;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  if (!configured()) return res.status(503).json({ configured: false, reason: 'store' });
  if (!process.env.ADMIN_KEY) return res.status(503).json({ configured: false, reason: 'key' });
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'key' });

  try {
    const [vids] = await redis([['ZREVRANGE', 'users', '0', String(LIMIT - 1)]]);
    const list = vids || [];
    const cmds = [];
    list.forEach((v) => cmds.push(['HGETALL', `u:${v}`], ['SMEMBERS', `pg:${v}`], ['SMEMBERS', `ch:${v}`], ['SMEMBERS', `st:${v}`]));
    const out = await redis(cmds);
    const nums = (a) => (a || []).map(Number).sort((x, y) => x - y);
    const rows = list.map((vid, i) => {
      const u = toObject(out[i * 4]);
      return {
        vid,
        pid: u.pid || null,
        name: u.name || '',
        flips: Number(u.flips || 0),
        pages: nums(out[i * 4 + 1]),
        last: u.last !== undefined ? Number(u.last) : null,
        chapters: nums(out[i * 4 + 2]),
        stamps: nums(out[i * 4 + 3]),
        prizes: [1, 2, 3, 4].map((s) => u[`prize${s}`] || null),
        claimed: u.claimed === '1',
        first: Number(u.first || 0),
        seen: Number(u.seen || 0)
      };
    });
    return res.status(200).json({ configured: true, rows });
  } catch (err) {
    return res.status(502).json({ error: 'store' });
  }
};
