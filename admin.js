/**
 * Trang quản trị: xem mỗi mã thẻ lật bao nhiêu trang, đã xem những trang nào,
 * nghe mấy chương, đóng mấy dấu, trúng quà gì. Dữ liệu từ /api/admin (Upstash Redis trên Vercel).
 * Chưa nối kho dữ liệu (hoặc chạy ở máy) thì hiện số liệu của chính trình duyệt này để xem thử.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Giữ khớp với app.js (GATE_CODE, STATIONS, PRIZES, số trang sách)
  const GATE_CODE = 'CONG23';
  const STATIONS = [['Trạm Hướng Thiện', 'HUONG1'], ['Trạm Mái Ấm', 'MAIAM2'], ['Trạm Nếp Nhà', 'NEPNH3'], ['Trạm Tốt Lành', 'TOTLA4']];
  const PRIZE_LABEL = { sticker: 'Sticker', keychain: 'Móc khoá', none: 'Không trúng' };
  const PAGE_COUNT = 22;
  const pageName = (p) => p == null ? '—' : p === 0 ? 'Bìa' : p === 1 ? 'Lời mở đầu' : p === 2 ? 'Mục lục'
    : p <= 18 ? `Ch.${Math.floor((p - 3) / 4) + 1} · tr.${p}` : p === 19 ? 'Tổng kết' : p === 20 ? 'Sự kiện' : 'Bìa sau';

  const state = { rows: [], sort: { k: 'seen', dir: -1 }, q: '', source: 'api' };
  const KEY = 'cnt_admin_key';
  const getKey = () => { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const setKey = (v) => { try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ } };

  // Dữ liệu của chính trình duyệt này (đọc localStorage do app.js ghi)
  function localRows() {
    const get = (k, f) => { try { const v = localStorage.getItem('cnt_' + k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } };
    const vid = get('vid', null);
    if (!vid) return [];
    const pass = get('pass', null), stats = get('stats', { flips: 0, pages: [], last: null });
    const spins = (pass && pass.spins) || {};
    return [{
      vid, pid: pass ? pass.id : null, name: pass ? pass.nickname : '',
      flips: stats.flips || 0, pages: (stats.pages || []).slice().sort((a, b) => a - b), last: stats.last,
      chapters: get('chapters_done', []).map((i) => i + 1).sort(), stamps: pass ? pass.stamps.slice().sort() : [],
      prizes: [1, 2, 3, 4].map((s) => (spins[s] ? spins[s].prize : null)), claimed: !!(pass && pass.claimed),
      checkin: (get('checkin', null) || {}).at || 0,
      first: 0, seen: Date.now()
    }];
  }

  function notice(html) { const n = $('#notice'); n.hidden = !html; n.innerHTML = html ? `<i class="ph ph-info" aria-hidden="true"></i><div>${html}</div>` : ''; }

  async function load() {
    let res;
    try { res = await fetch('/api/admin', { headers: { 'x-admin-key': getKey() }, cache: 'no-store' }); }
    catch (e) { return showLocal('Không kết nối được máy chủ.'); }
    if (res.status === 401) { setKey(''); return showLogin(getKey() ? '' : ''); }
    if (res.status === 404 || res.status === 405 || res.status === 501) return showLocal('Đang chạy ở máy nên chưa có API.');
    let data = {};
    try { data = await res.json(); } catch (e) { /* bỏ qua */ }
    if (res.status === 503) {
      return showLocal(data.reason === 'key'
        ? 'Chưa đặt mật khẩu quản trị. Vào Vercel → Settings → Environment Variables, thêm <code>ADMIN_KEY</code> rồi Redeploy.'
        : 'Chưa nối kho dữ liệu. Vào Vercel → Storage → tạo <strong>Upstash Redis</strong> (miễn phí) → Connect với project này rồi Redeploy.');
    }
    if (!res.ok) return showLocal('Kho dữ liệu đang lỗi, thử tải lại sau ít phút.');
    state.source = 'api';
    state.rows = (data.rows || []).map(enrich);
    notice('');
    showApp();
  }

  function showLocal(why) {
    state.source = 'local';
    state.rows = localRows().map(enrich);
    notice(`${why} Đang hiển thị <strong>số liệu của trình duyệt này</strong> để xem thử. Khi đã nối kho dữ liệu trên Vercel, trang sẽ hiện tất cả người tham gia.`);
    showApp();
  }

  function enrich(r) {
    return Object.assign(r, {
      pagesN: r.pages.length, chaptersN: r.chapters.length, stampsN: r.stamps.length,
      prizesTxt: r.prizes.filter((p) => p && p !== 'none').map((p) => PRIZE_LABEL[p]).join(', ')
    });
  }

  function showLogin(err) {
    $('#app').hidden = true; $('#login').hidden = false;
    $('#login-err').textContent = err || '';
    $('#adm-key').focus();
  }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; render(); renderQR(); }

  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    setKey($('#adm-key').value.trim());
    const before = getKey();
    await load();
    if (!$('#login').hidden && before) $('#login-err').textContent = 'Mật khẩu chưa đúng.';
  });
  $('#btn-logout').addEventListener('click', () => { setKey(''); showLogin(''); });
  $('#btn-reload').addEventListener('click', load);
  $('#search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); renderRows(); });
  document.querySelectorAll('th[data-k]').forEach((th) => th.addEventListener('click', () => {
    const k = th.dataset.k;
    state.sort = { k, dir: state.sort.k === k ? -state.sort.dir : -1 };
    renderRows();
  }));

  function render() {
    const R = state.rows, n = R.length || 1;
    const sum = (f) => R.reduce((a, r) => a + f(r), 0);
    const prize = (k) => sum((r) => r.prizes.filter((p) => p === k).length);
    const tiles = [
      [R.length, 'Người tham gia'],
      [R.filter((r) => r.pid).length, 'Đã tạo thẻ'],
      [R.filter((r) => r.checkin).length, 'Đã check-in sự kiện'],
      [sum((r) => r.flips), 'Tổng lượt lật trang'],
      [(sum((r) => r.pagesN) / n).toFixed(1), `Trang đã xem trung bình (/${PAGE_COUNT})`],
      [R.filter((r) => r.chaptersN === 4).length, 'Nghe đủ 4 chương'],
      [R.filter((r) => r.stampsN === 4).length, 'Đủ 4 dấu trạm'],
      [prize('sticker'), 'Sticker đã trúng'],
      [prize('keychain'), 'Móc khoá đã trúng']
    ];
    tiles.splice(5, 1); // bỏ ô "nghe đủ 4 chương" cho vừa 2 hàng × 4 ô
    $('#tiles').innerHTML = tiles.map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('');
    $('#people-sub').textContent = state.source === 'api' ? `${R.length} người, sắp theo hoạt động gần nhất` : 'Số liệu của trình duyệt này';
    renderRows();
  }

  function renderRows() {
    const { k, dir } = state.sort;
    document.querySelectorAll('th[data-k]').forEach((th) => th.setAttribute('aria-sort', th.dataset.k === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
    const rows = state.rows
      .filter((r) => !state.q || (r.pid || '').toLowerCase().includes(state.q) || (r.name || '').toLowerCase().includes(state.q))
      .sort((a, b) => { const x = a[k] == null ? -1 : a[k], y = b[k] == null ? -1 : b[k]; return (x > y ? 1 : x < y ? -1 : 0) * dir; });
    const dots = (arr) => `<span class="dots" aria-label="${arr.length}/4">${[1, 2, 3, 4].map((i) => `<i class="${arr.includes(i) ? 'on' : ''}"></i>`).join('')}</span>`;
    $('#rows').innerHTML = rows.length ? rows.map((r) => `<tr>
      <td><span class="mono">${esc(r.pid || '—')}</span></td>
      <td>${esc(r.name || '(chưa tạo thẻ)')}${r.checkin ? ' <small title="Đã check-in sự kiện">· đã tới</small>' : ''}</td>
      <td class="num">${r.flips}</td>
      <td class="num">${r.pagesN}/${PAGE_COUNT}<span class="bar"><i style="width:${Math.round((r.pagesN / PAGE_COUNT) * 100)}%"></i></span></td>
      <td>${pageName(r.last)}</td>
      <td>${dots(r.chapters)} ${r.chaptersN}/4</td>
      <td>${dots(r.stamps)} ${r.stampsN}/4</td>
      <td>${esc(r.prizesTxt || '—')}${r.claimed ? ' · <strong>đã nhận quà cuối</strong>' : ''}</td>
      <td>${r.seen ? new Date(r.seen).toLocaleString('vi-VN') : '—'}</td>
    </tr>`).join('') : `<tr><td class="empty" colspan="9">Chưa có ai${state.q ? ' khớp với ô tìm kiếm' : ''}.</td></tr>`;
  }

  $('#btn-csv').addEventListener('click', () => {
    const head = ['Mã thẻ', 'Tên', 'Check-in sự kiện', 'Lượt lật trang', 'Số trang đã xem', 'Các trang đã xem', 'Đang xem trang', 'Chương đã nghe', 'Dấu trạm', 'Quà trạm 1', 'Quà trạm 2', 'Quà trạm 3', 'Quà trạm 4', 'Đã nhận quà cuối', 'Lần đầu', 'Gần nhất', 'Mã trình duyệt'];
    const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const time = (t) => (t ? new Date(t).toISOString() : '');
    const lines = state.rows.map((r) => [r.pid, r.name, time(r.checkin), r.flips, r.pagesN, r.pages.join(' '), r.last, r.chapters.join(' '), r.stamps.join(' '),
      ...r.prizes.map((p) => (p ? PRIZE_LABEL[p] : '')), r.claimed ? 'có' : '', time(r.first), time(r.seen), r.vid].map(cell).join(','));
    const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chuyen-nha-tao-so-lieu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  // Mã QR in cho cổng và bốn trạm: quét bằng camera điện thoại là mở thẳng trang
  function renderQR() {
    const base = location.origin + '/';
    const items = [['Cổng check-in', 'Quét để check-in sự kiện', GATE_CODE, `${base}?vao=${GATE_CODE}`]]
      .concat(STATIONS.map(([name, code]) => [name, 'Quét để đóng dấu và quay thưởng', code, `${base}?tram=${code}`]));
    const grid = $('#qr-grid');
    if (grid.dataset.done) return;
    grid.dataset.done = '1';
    grid.innerHTML = items.map(([t, sub, code, url], i) => `<div class="qr-card"><strong>${t}</strong><span>${sub}</span><div id="qr-${i}"></div><code>${code}</code><small>${url}</small></div>`).join('');
    const draw = () => items.forEach(([, , , url], i) => {
      if (typeof QRCode === 'undefined') { document.getElementById('qr-' + i).textContent = url; return; }
      new QRCode(document.getElementById('qr-' + i), { text: url, width: 150, height: 150, colorDark: '#1b120c', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    });
    if (typeof QRCode !== 'undefined') draw(); else window.addEventListener('load', draw, { once: true });
  }

  load();
})();
