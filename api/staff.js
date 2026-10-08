// POST /api/staff — thao tác của nhân sự sự kiện (trang staff.html). Cần mật khẩu STAFF_KEY (hoặc ADMIN_KEY).
//   {action:'login'}                      → kiểm tra mật khẩu
//   {action:'lookup', pid}                → xem thẻ
//   {action:'stamp',  pid, station}       → đóng dấu trạm + máy chủ bốc quà vòng quay của trạm đó
//   {action:'give',   pid, station}       → xác nhận đã trao quà vòng quay của trạm
//   {action:'checkout', pid}              → xác nhận đã trao quà cuối (đủ 4 dấu)
//   {action:'code', station}              → mã dự phòng 6 số của trạm (đổi mỗi phút) để người chơi tự nhập
// Sai mật khẩu 5 lần thì khoá 15 phút.
const { configured, redis, toObject, readBody, PID_RE, passView, checkKey, stampCmds, stationCode, CODE_STEP } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (!configured()) return res.status(503).json({ configured: false, reason: 'store' });
  if (!process.env.STAFF_KEY && !process.env.ADMIN_KEY) return res.status(503).json({ configured: false, reason: 'key' });

  try {
    const auth = await checkKey(req, [['admin', process.env.ADMIN_KEY], ['staff', process.env.STAFF_KEY]]);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.status === 429 ? 'locked' : 'key' });

    const b = readBody(req) || {};
    if (b.action === 'login') return res.status(200).json({ role: auth.role });
    if (b.action === 'code') {
      const s = Number(b.station);
      if (!(s >= 1 && s <= 4)) return res.status(400).json({ error: 'station' });
      const now = Date.now();
      return res.status(200).json({ code: stationCode(s, now), expiresIn: CODE_STEP - (now % CODE_STEP) });
    }

    const pid = String(b.pid || '').toUpperCase();
    if (!PID_RE.test(pid)) return res.status(400).json({ error: 'id' });
    const key = `pass:${pid}`;
    const [h] = await redis([['HGETALL', key]]);
    const o = toObject(h);
    if (!o.pid) return res.status(404).json({ error: 'notfound' });
    const st = Number(b.station);
    const now = String(Date.now());
    const cmds = [];
    let note = '';

    if (b.action === 'stamp') {
      if (!(st >= 1 && st <= 4)) return res.status(400).json({ error: 'station' });
      if (o[`st${st}`]) note = 'already';
      else cmds.push(...stampCmds(o, key, st, now));
    } else if (b.action === 'give') {
      if (!(st >= 1 && st <= 4) || !o[`st${st}`]) return res.status(400).json({ error: 'station' });
      if (o[`given${st}`]) note = 'already'; else cmds.push(['HSET', key, `given${st}`, now]);
    } else if (b.action === 'checkout') {
      const n = [1, 2, 3, 4].filter((s) => o[`st${s}`]).length;
      if (n < 4) return res.status(400).json({ error: 'stamps', stamps: n });
      if (o.claimed) note = 'already';
      else { cmds.push(['HSET', key, 'claimed', now]); if (o.vid) cmds.push(['HSET', `u:${o.vid}`, 'claimed', '1']); }
    } else if (b.action !== 'lookup') {
      return res.status(400).json({ error: 'action' });
    }

    cmds.push(['HGETALL', key]);
    const out = await redis(cmds);
    return res.status(200).json({ note, pass: passView(toObject(out[out.length - 1])) });
  } catch (err) {
    return res.status(502).json({ error: 'store' });
  }
};
