/**
 * Trang nhân sự: quét QR hộ chiếu người chơi để đóng dấu trạm, xác nhận trao quà vòng quay,
 * và ở bàn check-out thì xác nhận trao quà cuối. Mọi thao tác đi qua /api/staff (cần mật khẩu STAFF_KEY).
 * Kết quả vòng quay do máy chủ bốc lúc đóng dấu; điện thoại người chơi tự cập nhật trong vài giây.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Giữ khớp với app.js (STATIONS, PRIZES)
  const STATIONS = ['Trạm Hướng Thiện', 'Trạm Mái Ấm', 'Trạm Nếp Nhà', 'Trạm Tốt Lành'];
  const PLACES = [[1, STATIONS[0]], [2, STATIONS[1]], [3, STATIONS[2]], [4, STATIONS[3]], [0, 'Bàn check-out (trao quà cuối)']];
  const PRIZE = { sticker: 'Sticker Táo Quân', keychain: 'Móc khoá cá chép', blindbox: 'Blindbox bí ẩn', none: 'Không trúng' };
  const PID_RE = /(TAO|OFF)-[A-Z0-9]{6}/;

  // Phiên đăng nhập: lưu trong tab, tự hết hạn sau 8 tiếng
  const SESSION = 'cnt_staff', TTL = 8 * 3600 * 1000;
  const getSession = () => { try { const v = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); return v && Date.now() - v.at < TTL ? v : null; } catch (e) { return null; } };
  const setSession = (v) => { try { if (v) sessionStorage.setItem(SESSION, JSON.stringify(v)); else sessionStorage.removeItem(SESSION); } catch (e) { /* bỏ qua */ } };
  let session = getSession();
  let place = Number((() => { try { return localStorage.getItem('cnt_staff_place'); } catch (e) { return null; } })() || 1);
  let scanner = null, scanning = false, current = null;

  function notice(html, tone) {
    const n = $('#notice');
    n.hidden = !html;
    n.className = 'verdict ' + (tone || 'warn');
    n.innerHTML = html ? `<i class="ph ph-info" aria-hidden="true"></i><span>${html}</span>` : '';
  }

  async function api(body) {
    let r;
    try {
      r = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-staff-key': session ? session.key : '' }, body: JSON.stringify(body) });
    } catch (e) { return { status: 0 }; }
    const json = (r.headers.get('content-type') || '').includes('json');
    return { status: r.status, json, data: json ? await r.json().catch(() => ({})) : {} };
  }
  const why = (res) => res.status === 0 ? 'Mất mạng. Ghi tay mã thẻ và trạm, nhập bù khi có mạng.'
    : !res.json ? 'Trang staff cần chạy trên Vercel (ở máy chưa có API).'
    : res.status === 503 ? (res.data.reason === 'key' ? 'Chưa đặt mật khẩu STAFF_KEY trên Vercel.' : 'Chưa nối kho dữ liệu Upstash trên Vercel.')
    : res.status === 429 ? 'Sai mật khẩu quá nhiều lần. Thử lại sau 15 phút.'
    : res.status === 401 ? 'Mật khẩu chưa đúng.'
    : res.status === 404 ? 'Không tìm thấy thẻ này. Nếu mã bắt đầu bằng OFF-, nhờ người chơi bật mạng rồi mở lại trang để thẻ đồng bộ.'
    : 'Máy chủ đang lỗi, thử lại sau ít phút.';

  // ---------------------------------------------------------------- đăng nhập
  function showLogin(err) {
    stopScan();
    $('#app').hidden = true; $('#login').hidden = false; $('#btn-logout').hidden = true;
    $('#places').innerHTML = PLACES.map(([v, t]) => `<label class="${v === 0 ? 'full' : ''}"><input type="radio" name="place" value="${v}" ${v === place ? 'checked' : ''}> ${t}</label>`).join('');
    $('#login-err').textContent = err || '';
    $('#stf-key').focus();
  }
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = $('#stf-key').value.trim();
    if (!key) { $('#login-err').textContent = 'Nhập mật khẩu nhân sự.'; return; }
    place = Number(($('input[name="place"]:checked') || {}).value || 1);
    try { localStorage.setItem('cnt_staff_place', String(place)); } catch (er) { /* bỏ qua */ }
    session = { key, at: Date.now() };
    const res = await api({ action: 'login' });
    if (res.status !== 200) { session = null; setSession(null); $('#login-err').textContent = why(res); return; }
    setSession(session);
    showApp();
  });
  $('#btn-logout').addEventListener('click', () => { session = null; setSession(null); showLogin(''); });
  $('#btn-place').addEventListener('click', () => showLogin(''));

  function showApp() {
    $('#login').hidden = true; $('#app').hidden = false; $('#btn-logout').hidden = false;
    $('#where-name').textContent = place ? STATIONS[place - 1] : 'Bàn check-out';
    $('#scan-title').textContent = place ? 'Quét QR hộ chiếu để đóng dấu' : 'Quét QR hộ chiếu để trao quà cuối';
    renderLog();
    loadCode();
  }

  // ---------------------------------------------------------------- mã dự phòng 6 số của trạm (đổi mỗi phút)
  let codeTimer = 0;
  async function loadCode() {
    clearTimeout(codeTimer);
    const box = $('#otp');
    box.hidden = !place;
    if (!place || $('#app').hidden) return;
    const res = await api({ action: 'code', station: place });
    if (res.status !== 200) { $('#otp-code').textContent = '······'; codeTimer = setTimeout(loadCode, 10000); return; }
    const { code, expiresIn } = res.data;
    $('#otp-code').textContent = code.slice(0, 3) + ' ' + code.slice(3);
    const bar = $('#otp-bar');
    bar.style.transition = 'none'; bar.style.transform = `scaleX(${expiresIn / 60000})`;
    requestAnimationFrame(() => { bar.style.transition = `transform ${expiresIn}ms linear`; bar.style.transform = 'scaleX(0)'; });
    codeTimer = setTimeout(loadCode, expiresIn + 300);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && session) loadCode(); });

  // ---------------------------------------------------------------- camera
  async function startScan() {
    if (typeof Html5Qrcode === 'undefined') { notice('Chưa tải được thư viện quét QR. Kiểm tra mạng, hoặc nhập mã thẻ bằng tay.'); return; }
    $('#result').hidden = true;
    if (!scanner) scanner = new Html5Qrcode('reader');
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } }, onScan, () => {});
      scanning = true;
      $('#btn-cam').innerHTML = '<i class="ph ph-stop-circle" aria-hidden="true"></i> Tắt camera';
    } catch (err) {
      notice('Không mở được camera. Cho phép trình duyệt dùng camera (trang phải mở bằng https), hoặc nhập mã thẻ bằng tay.');
    }
  }
  async function stopScan() {
    if (scanner && scanning) { try { await scanner.stop(); } catch (e) { /* bỏ qua */ } }
    scanning = false;
    $('#btn-cam').innerHTML = '<i class="ph ph-camera" aria-hidden="true"></i> Mở camera';
  }
  $('#btn-cam').addEventListener('click', () => (scanning ? stopScan() : startScan()));
  function onScan(text) {
    const m = String(text).toUpperCase().match(PID_RE);
    if (!m) { notice('QR này không phải hộ chiếu Chuyện Nhà Táo.'); return; }
    if (navigator.vibrate) navigator.vibrate(60);
    stopScan();
    lookup(m[0]);
  }
  $('#manual').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = $('#manual-id').value.toUpperCase().replace(/\s/g, '').match(PID_RE);
    if (!m) { notice('Mã thẻ có dạng TAO- và 6 ký tự.'); return; }
    lookup(m[0]);
  });

  // ---------------------------------------------------------------- tra thẻ và thao tác
  async function lookup(pid) {
    notice('');
    const res = await api({ action: 'lookup', pid });
    if (res.status === 401) { session = null; setSession(null); return showLogin('Phiên đăng nhập hết hạn, nhập lại mật khẩu.'); }
    if (res.status !== 200) { renderResult(null, { tone: 'err', text: why(res), pid }); return; }
    current = res.data.pass;
    // Ở trạm: quét là đóng dấu luôn cho nhanh (nếu chưa đóng)
    if (place && !current.stamps[place]) return act('stamp');
    renderResult(current, place ? { tone: 'warn', text: `Thẻ này đã đóng dấu ${STATIONS[place - 1]} rồi.` } : null);
  }

  async function act(action, station) {
    const res = await api({ action, pid: current.pid, station: station || place });
    if (res.status !== 200) { renderResult(current, { tone: 'err', text: res.data.error === 'stamps' ? `Chưa đủ dấu (${res.data.stamps}/4), chưa trao quà cuối được.` : why(res) }); return; }
    current = res.data.pass;
    const already = res.data.note === 'already';
    let msg;
    if (action === 'stamp') {
      const pz = current.prizes[place];
      msg = already ? { tone: 'warn', text: `Đã đóng dấu ${STATIONS[place - 1]} từ trước.` }
        : { tone: 'ok', text: `Đã đóng dấu ${STATIONS[place - 1]}.`, sub: pz && pz !== 'none' ? `Vòng quay: ${PRIZE[pz]}. Người chơi quay trên điện thoại xong thì trao quà.` : 'Vòng quay lần này không trúng quà.' };
      if (!already) addLog(current, `Đóng dấu · quà: ${PRIZE[pz] || '—'}`);
    } else if (action === 'give') {
      msg = { tone: 'ok', text: `Đã ghi nhận trao ${PRIZE[current.prizes[station || place]]}.` };
      addLog(current, `Trao ${PRIZE[current.prizes[station || place]]}`);
    } else if (action === 'checkout') {
      msg = already ? { tone: 'warn', text: 'Quà cuối đã trao từ trước. Không trao lại.' } : { tone: 'ok', text: 'Đã xác nhận trao quà cuối.' };
      if (!already) addLog(current, 'Trao quà cuối');
    }
    if (navigator.vibrate && msg.tone === 'ok') navigator.vibrate([40, 40, 80]);
    renderResult(current, msg);
  }

  function renderResult(p, msg) {
    const box = $('#result');
    box.hidden = false;
    if (!p) {
      box.innerHTML = `<div class="verdict err"><i class="ph ph-warning-circle" aria-hidden="true"></i><span>${esc(msg.text)}${msg.pid ? `<small>Mã: ${esc(msg.pid)}</small>` : ''}</span></div>
        <button class="btn btn-primary btn-xl" type="button" data-next>Quét người tiếp theo</button>`;
    } else {
      const n = Object.keys(p.stamps).length;
      // Quà vòng quay chưa trao: ở trạm thì quà của trạm này, ở check-out thì mọi trạm còn thiếu
      const toGive = (place ? [place] : [1, 2, 3, 4]).filter((s) => p.prizes[s] && p.prizes[s] !== 'none' && !p.given[s]);
      box.innerHTML = `
        <div class="who"><div><strong>${esc(p.name)}</strong><span class="mono">${esc(p.pid)}</span></div><span class="badge-n">${n}/4 dấu</span></div>
        <div class="stamps4">${[1, 2, 3, 4].map((s) => `<div class="${p.stamps[s] ? 'on' : ''} ${s === place ? 'here' : ''}">
          <i class="ph${p.stamps[s] ? '-fill' : ''} ph-${p.stamps[s] ? 'seal-check' : 'circle-dashed'}" aria-hidden="true"></i>${STATIONS[s - 1].replace('Trạm ', '')}
          <small>${p.prizes[s] ? PRIZE[p.prizes[s]] + (p.given[s] ? ' ✓' : '') : ''}</small></div>`).join('')}</div>
        ${msg ? `<div class="verdict ${msg.tone}"><i class="ph${msg.tone === 'ok' ? '-fill ph-check-circle' : ' ph-info'}" aria-hidden="true"></i><span>${esc(msg.text)}${msg.sub ? `<small>${esc(msg.sub)}</small>` : ''}</span></div>` : ''}
        ${place && !p.stamps[place] ? `<button class="btn btn-primary btn-xl" type="button" data-act="stamp">Đóng dấu ${STATIONS[place - 1]}</button>` : ''}
        ${toGive.map((s) => `<button class="btn btn-ghost btn-xl" type="button" data-give="${s}"><i class="ph ph-gift" aria-hidden="true"></i> Đã trao ${PRIZE[p.prizes[s]]}${place ? '' : ` (${STATIONS[s - 1].replace('Trạm ', '')})`}</button>`).join('')}
        ${!place ? (n < 4 ? `<div class="verdict warn"><i class="ph ph-info" aria-hidden="true"></i><span>Mới có ${n}/4 dấu, chưa trao quà cuối.</span></div>`
          : p.claimed ? `<div class="verdict warn"><i class="ph ph-info" aria-hidden="true"></i><span>Đã trao quà cuối lúc ${new Date(p.claimed).toLocaleTimeString('vi-VN')}. Không trao lại.</span></div>`
          : `<p style="text-align:center">Mã nhận quà: <strong style="font-family:ui-monospace,Consolas,monospace;font-size:20px">${esc(p.gift || '')}</strong></p>
             <button class="btn btn-primary btn-xl" type="button" data-act="checkout">Xác nhận trao quà cuối</button>`) : ''}
        <button class="btn btn-quiet" type="button" data-next><i class="ph ph-scan" aria-hidden="true"></i> Quét người tiếp theo</button>`;
    }
    box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; act(b.dataset.act); }));
    box.querySelectorAll('[data-give]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; act('give', Number(b.dataset.give)); }));
    box.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => { box.hidden = true; $('#manual-id').value = ''; startScan(); }));
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- nhật ký trên máy staff
  function addLog(p, what) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem('cnt_staff_log') || '[]'); } catch (e) { /* bỏ qua */ }
    log.unshift({ pid: p.pid, name: p.name, what, at: Date.now() });
    try { localStorage.setItem('cnt_staff_log', JSON.stringify(log.slice(0, 20))); } catch (e) { /* bỏ qua */ }
    renderLog();
  }
  function renderLog() {
    let log = [];
    try { log = JSON.parse(localStorage.getItem('cnt_staff_log') || '[]'); } catch (e) { /* bỏ qua */ }
    $('#log').innerHTML = log.length ? log.slice(0, 10).map((x) => `<li><span><strong>${esc(x.name)}</strong> · ${esc(x.what)}</span><small>${new Date(x.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small></li>`).join('')
      : '<li><span style="color:var(--text-muted)">Chưa có ai.</span></li>';
  }

  if (session) showApp(); else showLogin('');
})();
