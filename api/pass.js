// /api/pass — thẻ thông hành lưu trên máy chủ để staff tra được và đóng dấu.
//   GET  /api/pass?id=TAO-XXXXXX   → trạng thái thẻ (dấu, quà vòng quay, đã trao quà). Điện thoại người chơi gọi định kỳ.
//   POST /api/pass {pid, name, vid, gift} → tạo thẻ (hoặc đưa thẻ có sẵn trên máy lên máy chủ).
// Mã thẻ đóng vai trò "chìa khoá" của người chơi: ai có mã mới đọc được thẻ, và chỉ đọc chứ không sửa được dấu.
// Redis: pass:{pid} hash  pid, name, vid, created, gift, st{n} (giờ đóng dấu), prize{n}, given{n}, claimed
const { configured, redis, toObject, readBody, PID_RE, passView } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(503).json({ configured: false });

  if (req.method === 'GET') {
    const id = String(req.query?.id || new URL(req.url, 'http://x').searchParams.get('id') || '').toUpperCase();
    if (!PID_RE.test(id)) return res.status(400).json({ error: 'id' });
    const [h] = await redis([['HGETALL', `pass:${id}`]]);
    const view = passView(toObject(h));
    return view ? res.status(200).json(view) : res.status(404).json({ error: 'notfound' });
  }

  if (req.method === 'POST') {
    const b = readBody(req) || {};
    const pid = String(b.pid || '').toUpperCase();
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 24) : '';
    const vid = /^[A-Za-z0-9-]{8,40}$/.test(b.vid || '') ? b.vid : '';
    const gift = /^QUA-[A-Z0-9]{4}$/.test(b.gift || '') ? b.gift : '';
    if (!PID_RE.test(pid) || name.length < 2) return res.status(400).json({ error: 'input' });
    const key = `pass:${pid}`;
    const [created] = await redis([['HSETNX', key, 'pid', pid]]);
    if (!created) {
      // Mã đã có: nếu là thẻ của chính trình duyệt này (đưa lại lên máy chủ) thì trả về, không thì báo trùng mã
      const [h] = await redis([['HGETALL', key]]);
      const o = toObject(h);
      if (vid && o.vid === vid) return res.status(200).json(passView(o));
      return res.status(409).json({ error: 'exists' });
    }
    const cmds = [['HSET', key, 'name', name, 'created', String(Date.now())]];
    if (vid) cmds.push(['HSET', key, 'vid', vid], ['HSET', `u:${vid}`, 'pid', pid, 'name', name], ['HSET', 'pid2vid', pid, vid]);
    if (gift) cmds.push(['HSET', key, 'gift', gift]);
    cmds.push(['ZADD', 'passes', String(Date.now()), pid], ['HGETALL', key]);
    const out = await redis(cmds);
    return res.status(201).json(passView(toObject(out[out.length - 1])));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
};
