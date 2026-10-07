// Kho dữ liệu đo lường: Upstash Redis qua REST API (không cần cài thư viện).
// Trên Vercel: Storage → Upstash Redis (Marketplace) → Connect với project,
// Vercel tự thêm biến KV_REST_API_URL / KV_REST_API_TOKEN (hoặc UPSTASH_REDIS_REST_URL / _TOKEN).
// Tên file bắt đầu bằng "_" nên Vercel không coi đây là một đường dẫn API.

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

module.exports = { configured, redis, toObject };
