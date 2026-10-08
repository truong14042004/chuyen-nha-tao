/**
 * CHUYỆN NHÀ TÁO — logic landing page
 * Theo PDF "2.3 Landing Page": S01 header/hero, S02 storybook, S03 tổng kết,
 * S04 đăng ký + consent, S05 passport 4 trạm, S06 check-out quà, S07–S08 UGC,
 * S09 lỗi/offline/chính sách. Sự kiện analytics đặt tên đúng cột "Dữ liệu thu thập & tracking".
 */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const hasGsap = typeof window.gsap !== 'undefined';
  // Chuyển động: mặc định theo cài đặt hệ điều hành, người xem có thể tự đổi bằng nút trên header
  // (PDF D: "có tùy chọn giảm chuyển động"). Lựa chọn được nhớ qua localStorage.
  const osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motionPref = null;
  try { motionPref = localStorage.getItem('cnt_motion'); } catch (e) { /* bỏ qua */ }
  const reduceMotion = motionPref ? motionPref === 'reduced' : osReduce;
  document.documentElement.classList.toggle('motion-reduced', reduceMotion);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ======================================================================
   * Lưu trữ cục bộ (try/catch: chế độ ẩn danh có thể chặn localStorage)
   * ==================================================================== */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('cnt_' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem('cnt_' + key, JSON.stringify(val)); } catch (e) { /* bỏ qua */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('cnt_')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* bỏ qua */ } }
  };

  /* ======================================================================
   * Analytics + UTM (Checklist kỹ thuật: gắn sự kiện theo cột tracking)
   * ==================================================================== */
  window.dataLayer = window.dataLayer || [];
  const utm = {};
  new URLSearchParams(location.search).forEach((v, k) => { if (k.startsWith('utm_')) utm[k] = v; });
  if (Object.keys(utm).length) store.set('utm', utm);
  function track(event, props = {}) {
    const payload = Object.assign({ event, ts: Date.now() }, store.get('utm', {}), props);
    window.dataLayer.push(payload);
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.debug('[track]', payload);
  }
  track('page_view', { utm_source: utm.utm_source || null });
  if (store.get('visited', false)) track('return_visit'); else store.set('visited', true);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { from: el.dataset.trackFrom });
  });

  /* ======================================================================
   * Đo lường theo từng người (nhóm yêu cầu: admin xem mỗi ID lật bao nhiêu trang).
   * vid: mã ngẫu nhiên của trình duyệt này; có thẻ thì gửi kèm mã thẻ và tên.
   * Sự kiện được gom lại, gửi lên /api/track vài giây một lần và khi rời trang;
   * mất mạng thì giữ trong máy để gửi sau. Đồng thời cộng dồn trên máy (cnt_stats)
   * để trang quản trị vẫn xem được dữ liệu của máy này khi chưa nối kho dữ liệu.
   * ==================================================================== */
  const meter = {
    vid: store.get('vid', null),
    q: store.get('q', []),
    off: false,
    timer: 0,
    stats: Object.assign({ flips: 0, pages: [], last: null }, store.get('stats', {}))
  };
  if (!meter.vid) {
    meter.vid = 'v-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
    store.set('vid', meter.vid);
  }
  function measure(t, data = {}) {
    meter.q.push(Object.assign({ t, ts: Date.now() }, data));
    if (meter.q.length > 300) meter.q.splice(0, meter.q.length - 300);
    store.set('q', meter.q);
    if (t === 'flip') {
      const st = meter.stats;
      st.flips++; st.last = data.p;
      if (!st.pages.includes(data.p)) st.pages.push(data.p);
      store.set('stats', st);
    }
    clearTimeout(meter.timer);
    meter.timer = setTimeout(() => flushMeter(), 4000);
  }
  function flushMeter(leaving) {
    if (meter.off || !meter.q.length || !navigator.onLine) return;
    const events = meter.q.slice();
    const body = JSON.stringify({ vid: meter.vid, pid: pass ? pass.id : null, name: pass ? pass.nickname : '', events });
    const sent = () => { meter.q.splice(0, events.length); store.set('q', meter.q); };
    if (leaving && navigator.sendBeacon) {
      if (navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) sent();
      return;
    }
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
      .then((r) => {
        if (r.ok) sent();
        // Chưa có API (chạy ở máy) hoặc chưa nối kho dữ liệu: thôi gửi trong lần mở trang này
        else if ([404, 405, 501, 503].includes(r.status)) meter.off = true;
      })
      .catch(() => { /* mất mạng: giữ hàng đợi, gửi lần sau */ });
  }
  window.addEventListener('pagehide', () => flushMeter(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushMeter(true); });

  /* ======================================================================
   * Toast — microcopy giọng ấm áp, không phán xét (PDF mục E)
   * ==================================================================== */
  function toast(msg, type = 'info', icon) {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const ic = icon || (type === 'ok' ? 'check-circle' : type === 'gold' ? 'medal' : type === 'err' ? 'warning-circle' : 'info');
    t.innerHTML = `<i class="ph ph-${ic}" aria-hidden="true"></i><span>${msg}</span>`;
    box.appendChild(t);
    if (hasGsap && !reduceMotion) gsap.from(t, { y: 16, opacity: 0, duration: 0.3, ease: 'power2.out' });
    setTimeout(() => {
      if (hasGsap && !reduceMotion) gsap.to(t, { y: 8, opacity: 0, duration: 0.2, onComplete: () => t.remove() });
      else t.remove();
    }, 4200);
  }

  /* ======================================================================
   * Hộp thoại dùng chung (<dialog>): trả về Promise với value của nút được bấm.
   * Esc hoặc nút đầu tiên khi nhấn Enter = huỷ, nên không bao giờ xoá nhầm.
   * ==================================================================== */
  const dlg = $('#dlg');
  function ask({ title, html, tone = '', buttons }) {
    return new Promise((resolve) => {
      dlg.className = 'dlg' + (tone ? ' dlg-' + tone : '');
      dlg.innerHTML = `<form method="dialog" class="dlg-box">
        <h3 class="dlg-title" id="dlg-title">${title}</h3>
        <div class="dlg-body">${html}</div>
        <div class="dlg-actions">${buttons.map((b) => `<button class="btn ${b.cls || 'btn-ghost'}" value="${b.value}"${b.id ? ` id="${b.id}"` : ''}${b.disabled ? ' disabled' : ''}>${b.label}</button>`).join('')}</div>
      </form>`;
      dlg.returnValue = '';
      // Nhận kết quả từ submit của form (đồng bộ, có e.submitter); Esc đi qua 'cancel'; 'close' để dự phòng
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v || ''); } };
      $('form', dlg).addEventListener('submit', (e) => done(e.submitter ? e.submitter.value : dlg.returnValue));
      dlg.addEventListener('cancel', () => done(''), { once: true });
      dlg.addEventListener('close', () => done(dlg.returnValue), { once: true });
      dlg.showModal();
      if (hasGsap && !reduceMotion) gsap.from('.dlg-box', { y: 18, opacity: 0, duration: 0.3, ease: 'power2.out' });
    });
  }
  // Bỏ dấu, viết hoa: so tên trùng và chữ xác nhận không phụ thuộc cách gõ dấu
  const plain = (v) => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').trim().toUpperCase().replace(/\s+/g, ' ');

  /* ======================================================================
   * Âm thanh: tiếng lửa bếp lách tách + lật trang (Web Audio, không tự phát)
   * ==================================================================== */
  const sound = {
    ctx: null, on: false, timer: null, master: null,
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },
    noise(dur, freq, gain) {
      const c = this.ctx, len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
    },
    crackle() {
      if (!this.on) return;
      this.noise(0.03 + Math.random() * 0.06, 1500 + Math.random() * 3500, 0.25 + Math.random() * 0.35);
      if (Math.random() < 0.15) this.noise(0.25, 300, 0.12); // tiếng củi nổ trầm
      this.timer = setTimeout(() => this.crackle(), 40 + Math.random() * 260);
    },
    toggle() {
      if (!this.init()) return false;
      this.on = !this.on;
      if (this.on) this.crackle(); else clearTimeout(this.timer);
      return this.on;
    },
    flip() { if (this.ctx && this.on) this.noise(0.18, 900, 0.35); },
    stamp() { if (this.ctx && this.on) { this.noise(0.09, 160, 1.1); this.noise(0.05, 1200, 0.25); } },
    // Âm thanh vòng quay: phát sau khi người chơi bấm Quay (đã có thao tác) nên không phụ thuộc nút tiếng lửa bếp
    tick() { if (this.ctx) this.noise(0.014, 3400, 0.45); },
    pop(big) {
      if (!this.ctx) return;
      const c = this.ctx, dur = big ? 0.55 : 0.07, len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, big ? 4 : 9);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = big ? 'lowpass' : 'highpass'; f.frequency.value = big ? 900 : 600 + Math.random() * 1600;
      const g = c.createGain(); g.gain.value = big ? 1.8 : 0.7 + Math.random() * 0.6;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
    },
    ting() {
      if (!this.ctx) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(880, c.currentTime);
      g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
      o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + 0.9);
    },
    chime() {
      if (!this.ctx || !this.on) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(660, c.currentTime); o.frequency.exponentialRampToValueAtTime(990, c.currentTime + 0.15);
      g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + 0.6);
    }
  };
  $('#sound-toggle').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const on = sound.toggle();
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Tắt tiếng lửa bếp' : 'Bật tiếng lửa bếp');
    btn.innerHTML = `<i class="ph ph-${on ? 'fire' : 'speaker-slash'}" aria-hidden="true"></i>`;
  });

  const motionBtn = $('#motion-toggle');
  function paintMotionBtn() {
    motionBtn.setAttribute('aria-pressed', String(!reduceMotion));
    motionBtn.setAttribute('aria-label', reduceMotion ? 'Bật hiệu ứng chuyển động' : 'Giảm hiệu ứng chuyển động');
    motionBtn.title = reduceMotion ? 'Bật hiệu ứng chuyển động' : 'Giảm hiệu ứng chuyển động';
    motionBtn.innerHTML = `<i class="ph ph-${reduceMotion ? 'pause-circle' : 'sparkle'}" aria-hidden="true"></i>`;
  }
  paintMotionBtn();
  motionBtn.addEventListener('click', () => {
    try { localStorage.setItem('cnt_motion', reduceMotion ? 'full' : 'reduced'); } catch (e) { /* bỏ qua */ }
    track('motion_toggle', { to: reduceMotion ? 'full' : 'reduced' });
    // Tải lại để cảnh 3D, ScrollTrigger và mọi hiệu ứng khởi tạo đúng chế độ mới, giữ vị trí cuộn
    try { sessionStorage.setItem('cnt_scroll', String(window.scrollY)); } catch (e) { /* bỏ qua */ }
    location.reload();
  });
  try {
    const y = sessionStorage.getItem('cnt_scroll');
    if (y !== null) { sessionStorage.removeItem('cnt_scroll'); requestAnimationFrame(() => window.scrollTo(0, +y)); }
  } catch (e) { /* bỏ qua */ }

  /* ======================================================================
   * S01 · Menu mobile
   * ==================================================================== */
  const menuBtn = $('#menu-toggle'), menu = $('#mobile-menu');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    menuBtn.innerHTML = `<i class="ph ph-${open ? 'x' : 'list'}" aria-hidden="true"></i>`;
    $('#site-header').classList.toggle('is-solid', open || window.scrollY > 40);
  }
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });

  /* ======================================================================
   * Offline (S09): báo thân thiện, vẫn cho dùng thẻ cục bộ
   * ==================================================================== */
  const offlineBar = $('#offline-bar');
  const syncOnline = () => { offlineBar.hidden = navigator.onLine; };
  window.addEventListener('online', () => {
    syncOnline();
    if (pass && !pass.synced) syncPass(); else toast('Đã có mạng lại.', 'ok', 'wifi-high');
    flushMeter();
  });
  window.addEventListener('offline', syncOnline);
  syncOnline();

  /* ======================================================================
   * S02 · STORYBOOK 4 CHƯƠNG
   * ==================================================================== */
  const CHAPTERS = [
    {
      short: 'Hướng thiện',
      title: 'Tự soi xét và hướng thiện',
      meaning: 'Nhìn lại một năm',
      icon: 'fire',
      img: 'images/chuong-1.jpg',
      alt: 'Người phụ nữ quét dọn gian bếp bên bếp lửa đỏ ngày 23 tháng Chạp',
      seed: 'Một năm qua, điều gì khiến bạn muốn làm lại tốt hơn?',
      story: 'Gian bếp là nơi kín đáo nhất trong nhà, nhưng cũng là nơi thấy rõ lòng người nhất. Bát cơm dẻo hay khê, bếp lửa đượm hay nguội, đều kể lại sự chăm chút của từng người. Ngày 23 tháng Chạp, ông Táo cưỡi cá chép về trời. Tự soi xét không phải để tự trách, mà để nhẹ lòng buông điều chưa tốt, gieo một hạt thiện cho năm mới.',
      badge: { name: 'Huy hiệu Hướng Thiện', desc: 'Dám nhìn thật lòng mình để sống tốt hơn.' },
      listen: {
        object: 'bếp lửa', icon: 'fire', teller: 'Bà kể',
        lines: [
          'Hồi bà còn nhỏ, chiều 23 tháng Chạp nào cụ cũng gọi cả nhà ra lau bếp.',
          'Cụ bảo: lau tro cho sạch để ông Táo về trời thấy nhà mình sống tử tế.',
          'Bà lau mãi rồi mới hiểu, cụ muốn mỗi người tự nhìn lại mình sau một năm.',
          'Lỗi nào thì nhận, việc tốt nào thì giữ, để sang năm lòng nhẹ như gian bếp mới lau.'
        ],
        takeaway: 'Hướng thiện bắt đầu từ việc dám nhìn thật lòng mình.'
      }
    },
    {
      short: 'Mái ấm',
      title: 'Gìn giữ mái ấm và hòa thuận',
      meaning: 'Giữ ấm một mái nhà',
      icon: 'house-line',
      img: 'images/chuong-2.jpg',
      pos: '44% 50%', // tranh ngang: giữ bà và cháu ở giữa khung
      alt: 'Gia đình ba thế hệ quây quần bên mâm cơm chiều cuối năm',
      seed: 'Lần gần nhất cả nhà ngồi ăn cơm cùng nhau là khi nào?',
      story: 'Ba vị Táo, hai ông một bà, như ba chân kiềng đỡ nồi cơm của cả nhà. Ngoài kia có giông gió đến đâu, về bên bếp lửa thì mọi bất đồng đều nhường chỗ cho thấu hiểu. Giữ lửa không chỉ là giữ than hồng, mà là giữ lời nói nhẹ nhàng và sự bao dung cho người thương dưới một mái nhà.',
      badge: { name: 'Huy hiệu Mái Ấm', desc: 'Giữ lửa bằng sự lắng nghe và bao dung.' },
      listen: {
        object: 'mâm cơm', icon: 'bowl-food', teller: 'Mẹ kể',
        lines: [
          'Năm ấy bố đi làm xa, tới tận chiều 23 mới về tới nhà.',
          'Cả nhà vẫn ngồi đợi, nồi cơm được ủ trong rơm cho khỏi nguội.',
          'Bố bước vào, chẳng ai trách một câu, chỉ có tiếng xới cơm và tiếng cười.',
          'Mẹ bảo: mái ấm là nơi lúc nào cũng có người chờ mình về.'
        ],
        takeaway: 'Mái ấm được giữ bằng sự chờ đợi và bao dung.'
      }
    },
    {
      short: 'Nếp nhà',
      title: 'Thành kính và trân trọng nếp nhà',
      meaning: 'Điều nhà mình giữ lại',
      icon: 'flower-lotus',
      img: 'images/chuong-3.jpg',
      alt: 'Ông dạy cháu thắp hương trước bàn thờ có mũ áo giấy ông Táo',
      seed: 'Nhà bạn đang giữ lại một nếp nào từ ông bà?',
      story: 'Mỗi nhà có một mạch nguồn riêng: chiếc kiềng của bà, thúng gạo nếp của mẹ, nén hương ông thắp mỗi chiều cuối năm. Nếp nhà là những điều giản dị được trao qua nhiều thế hệ: kính trọng tổ tiên, biết ơn từng giọt mồ hôi. Ngày tiễn ông Táo, mùi hương trầm nhắc ta nhớ mình từ đâu đến.',
      badge: { name: 'Huy hiệu Nếp Nhà', desc: 'Trân trọng cội nguồn và những điều được trao lại.' },
      listen: {
        object: 'nén hương', icon: 'flower-lotus', teller: 'Ông kể',
        lines: [
          'Ông dạy cháu thắp hương: hai tay cầm nén, cúi đầu ba lần cho thành kính.',
          'Cháu hỏi vì sao phải làm vậy. Ông cười, ngày xưa cụ dạy ông y như thế.',
          'Giờ ông dạy cháu, mai kia cháu lại dạy con của cháu.',
          'Nếp nhà không nằm trong sách, nó nằm trong những lần mình làm cùng nhau.'
        ],
        takeaway: 'Nếp nhà sống tiếp khi được trao lại qua từng thế hệ.'
      }
    },
    {
      short: 'Tốt lành',
      title: 'Khát vọng vươn lên và hướng tới điều tốt lành',
      meaning: 'Mang điều tốt lành đi tiếp',
      icon: 'fish',
      img: 'images/chuong-4.jpg',
      alt: 'Mẹ và con thả cá chép đỏ xuống hồ lúc bình minh',
      seed: 'Bạn muốn mang điều tốt lành nào sang năm mới?',
      story: 'Cá chép vượt vũ môn hóa rồng là hình ảnh của ý chí bền bỉ, dám vượt khó để vươn lên. Thả cá chép ngày 23 tháng Chạp không chỉ là một nghi lễ, mà là gửi theo ước mong được tự do, được tiến bước, và niềm tin vào một năm mới tốt đẹp hơn cho mình và cho gia đình.',
      badge: { name: 'Huy hiệu Tốt Lành', desc: 'Mang ước mong tốt đẹp đi tiếp sang năm mới.' },
      listen: {
        object: 'cá chép', icon: 'fish', teller: 'Mẹ kể cho con',
        lines: [
          'Sáng 23, hai mẹ con mang chậu cá chép đỏ ra bờ hồ.',
          'Con hỏi: cá có bị lạc không mẹ? Mẹ bảo cá sẽ bơi ngược dòng, vượt vũ môn.',
          'Như người mình, gặp khó vẫn cố đi tiếp, rồi sẽ tới nơi tốt đẹp.',
          'Con thả cá xuống nước, thì thầm một điều ước cho cả nhà.'
        ],
        takeaway: 'Điều tốt lành đến khi mình dám mang ước mong đi tiếp.'
      }
    }
  ];

  // ----------------------------------------------------------------------
  // Quyển sách lật trang (StPageFlip). Bố cục 22 trang:
  //   0 bìa trước · 1 lời mở đầu · 2 mục lục
  //   mỗi chương i: 3+4i tranh · 4+4i nội dung · 5+4i lắng nghe · 6+4i huy hiệu
  //   19 tổng kết huy hiệu · 20 sự kiện · 21 bìa sau
  // Trang đôi (desktop): [1,2] [3,4] [5,6] ... [19,20] → tranh|nội dung, lắng nghe|huy hiệu.
  // ----------------------------------------------------------------------
  const P = {
    cover: 0, intro: 1, toc: 2,
    art: (i) => 3 + i * 4, text: (i) => 4 + i * 4, game: (i) => 5 + i * 4, badge: (i) => 6 + i * 4,
    summary: 19, event: 20, back: 21, count: 22
  };
  const chapterOfPage = (p) => (p >= 3 && p <= 18 ? Math.floor((p - 3) / 4) : null);

  const book = {
    idx: Math.min(store.get('chapter', 0), 3),
    page: Math.min(Math.max(store.get('page', 0), 0), P.count - 1),
    done: new Set(store.get('chapters_done', [])),
    started: new Set(),
    flip: null
  };

  // ---------- Dựng các trang
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const pageHTML = [];
  const folio = (n) => `<span class="pg-folio" aria-hidden="true">${n}</span>`;
  pageHTML[P.cover] = `
    <div class="lp-cover">
      <p class="lp-box">Bếp-Lửa Tùng-Thư</p>
      <div class="lp-titles">
        <h3 class="lp-title">Chuyện<br>Nhà - Táo</h3>
        <p class="lp-red">Đêm Hai-Mươi-Ba Tháng Chạp</p>
        <p class="lp-small">Bốn chương</p>
      </div>
      <div class="lp-credit">
        <p class="lp-tiny">Kể - chuyện</p>
        <p>Bếp - Đỏ &nbsp;Giữ - Lửa</p>
        <p class="lp-plain">Nếp - nhà &nbsp;đoàn - viên</p>
      </div>
      <button class="lp-open" type="button" data-goto="${P.intro}">Mở sách <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
      <div class="lp-pub">
        <p>Nhà Bếp-Lửa</p>
        <p class="lp-big">Hội Gian-Bếp Ngày-Tết</p>
        <p class="lp-tiny">Xuất - bản</p>
      </div>
      <p class="lp-rule"><span>Tập số 1</span><span>Tháng Chạp</span></p>
      <span class="lp-libstamp" aria-hidden="true">Tủ sách<b>Gia-Đình</b>Số 23</span>
      <span class="lp-pencil" aria-hidden="true">No 23 — kệ bếp</span>
    </div>`;
  pageHTML[P.intro] = `
    <div class="pg-body">
      <p class="pg-kicker">Lời mở đầu</p>
      <h3 class="pg-title">Gửi người giữ lửa</h3>
      <p class="pg-prose">Ngày 23 tháng Chạp, ông Táo cưỡi cá chép về trời, kể lại một năm của mỗi gia đình. Cuốn sách nhỏ này mời bạn ngồi bên bếp lửa, đọc bốn câu chuyện về hướng thiện, mái ấm, nếp nhà và điều tốt lành.</p>
      <p class="pg-prose">Cuối mỗi chương có một câu chuyện nhỏ để bạn lắng nghe. Sách là phần đọc thêm, không bắt buộc: bạn có thể tạo thẻ thông hành ngay và đến sự kiện đi bốn trạm.</p>
      <p class="pg-hint"><i class="ph ph-hand-swipe-right" aria-hidden="true"></i> Kéo góc trang hoặc vuốt ngang để lật</p>
    </div>${folio(1)}`;
  pageHTML[P.toc] = `
    <div class="pg-body">
      <p class="pg-kicker">Mục lục</p>
      <ol class="pg-toc">
        ${CHAPTERS.map((c, i) => `<li><button type="button" data-goto="${P.art(i)}"><span class="toc-n">${ROMAN[i]}</span><span class="toc-t">${c.title}<small>${c.meaning}</small></span><span class="toc-p">${P.art(i)}</span></button></li>`).join('')}
        <li><button type="button" data-goto="${P.summary}"><span class="toc-n"><i class="ph ph-medal" aria-hidden="true"></i></span><span class="toc-t">Bộ huy hiệu và sự kiện</span><span class="toc-p">${P.summary}</span></button></li>
      </ol>
    </div>${folio(2)}`;
  CHAPTERS.forEach((c, i) => {
    pageHTML[P.art(i)] = `
      <div class="pg-art" style="--pos:${c.pos || 'center'}">
        <figure class="pg-plate">
          <img src="${c.img}" alt="${c.alt}" loading="lazy" decoding="async" onerror="this.remove()">
          <i class="ph ph-${c.icon} pg-art-icon" aria-hidden="true"></i>
          <figcaption>Hình ${ROMAN[i]}. ${c.alt}</figcaption>
        </figure>
        <p class="pg-seed"><small>Câu hỏi gieo</small>${c.seed}</p>
      </div>${folio(P.art(i))}`;
    pageHTML[P.text(i)] = `
      <div class="pg-body">
        <p class="pg-kicker">Chương ${ROMAN[i]} · ${c.meaning}</p>
        <h3 class="pg-title">${c.title}</h3>
        <p class="pg-prose pg-story">${c.story}</p>
        <div class="pg-tools">
          <button class="btn btn-ghost btn-sm" type="button" data-voice="${i}"><i class="ph ph-speaker-high" aria-hidden="true"></i> <span>Nghe đọc</span></button>
          <button class="btn btn-quiet btn-sm" type="button" data-goto="${P.game(i)}">Nghe chuyện kể <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
        </div>
      </div>${folio(P.text(i))}`;
    pageHTML[P.game(i)] = `<div class="pg-body"><p class="pg-kicker">Lắng nghe · Chương ${ROMAN[i]}</p><div class="game" id="game-${i}"></div></div>${folio(P.game(i))}`;
    pageHTML[P.badge(i)] = `<div class="pg-body pg-badge-page" id="badge-page-${i}"></div>${folio(P.badge(i))}`;
  });
  pageHTML[P.summary] = `
    <div class="pg-body">
      <p class="pg-kicker">Tổng kết</p>
      <h3 class="pg-title" data-summary-title>Gom đủ bốn huy hiệu</h3>
      <div class="badges pg-badges" id="badges"></div>
    </div>${folio(P.summary)}`;
  pageHTML[P.event] = `
    <div class="pg-body">
      <p class="pg-kicker">Hẹn gặp ở sự kiện</p>
      <h3 class="pg-title">Bốn trạm đang chờ bạn</h3>
      <p class="pg-prose" data-summary-text>Bốn trạm thực tế đang chờ bạn đóng dấu và nhận quà.</p>
      <dl class="event-meta">
        <div><i class="ph ph-calendar-blank" aria-hidden="true"></i><span><dt>Ngày giờ</dt><dd><span class="soon">Sắp công bố</span></dd></span></div>
        <div><i class="ph ph-map-pin" aria-hidden="true"></i><span><dt>Địa điểm</dt><dd><span class="soon">Sắp công bố</span></dd></span></div>
      </dl>
      <a class="btn btn-primary btn-block" href="#tram-trai-nghiem" data-track="cta_passport" data-track-from="summary">Lấy thẻ thông hành</a>
    </div>${folio(P.event)}`;
  pageHTML[P.back] = `
    <div class="lp-cover lp-back">
      <p class="lp-box">#Chuyện-Nhà-Táo</p>
      <div class="lp-titles">
        <p class="lp-red">Bếp - đỏ giữ - lửa</p>
        <p class="lp-small">Nếp - nhà đoàn - viên</p>
      </div>
      <button class="lp-open" type="button" data-goto="${P.cover}"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i> Đọc lại từ đầu</button>
      <p class="lp-rule"><span>Giá : một nụ cười</span><span>In lần thứ nhất</span></p>
    </div>`;

  const flipbookEl = $('#flipbook');
  const pageEls = pageHTML.map((html, n) => {
    const el = document.createElement('div');
    const hard = n === P.cover || n === P.back;
    el.className = 'pg' + (hard ? ' pg-hard' : '') + (n === P.cover ? ' pg-cover' : '') + (n === P.back ? ' pg-backcover' : '');
    if (hard) el.dataset.density = 'hard';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', n === P.cover ? 'Bìa sách' : n === P.back ? 'Bìa sau' : `Trang ${n}`);
    el.innerHTML = html;
    // Bấm vào nút, ô nhập, chip... không được kích hoạt lật trang của thư viện
    const guard = (e) => { if (e.target.closest('button, a, input, label, textarea, select, .chip, .option, [data-noflip]')) e.stopPropagation(); };
    el.addEventListener('mousedown', guard);
    el.addEventListener('touchstart', guard, { passive: true });
    flipbookEl.appendChild(el);
    return el;
  });

  // ---------- Tab chương
  const tabsEl = $('#chapter-tabs');
  CHAPTERS.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chapter-tab'; b.setAttribute('role', 'tab'); b.id = 'tab-' + i;
    b.setAttribute('aria-controls', 'flip-stage');
    b.innerHTML = `<span class="n">Chương ${i + 1}<i class="ph-fill ph-seal-check" aria-hidden="true" hidden></i></span><span class="t">${c.short}</span>`;
    b.addEventListener('click', () => goPage(P.art(i)));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
        $('#tab-' + n).focus(); goPage(P.art(n));
      }
    });
    tabsEl.appendChild(b);
  });

  function moveIndicator(animate) {
    const tab = $('#tab-' + book.idx), ind = $('.tab-indicator', tabsEl);
    const x = tab.offsetLeft - 6, w = tab.offsetWidth;
    if (hasGsap && animate && !reduceMotion) gsap.to(ind, { x, width: w, duration: 0.45, ease: 'power3.out' });
    else { ind.style.transform = `translateX(${x}px)`; ind.style.width = w + 'px'; }
  }
  window.addEventListener('resize', () => moveIndicator(false));

  function syncTabs() {
    $$('.chapter-tab', tabsEl).forEach((t, i) => {
      t.setAttribute('aria-selected', String(i === book.idx));
      t.tabIndex = i === book.idx ? 0 : -1;
      $('.ph-seal-check', t).hidden = !book.done.has(i);
      t.setAttribute('aria-label', `Chương ${i + 1}: ${CHAPTERS[i].short}${book.done.has(i) ? ', đã hoàn thành' : ''}`);
    });
  }

  function pageLabel(p) {
    if (p === P.cover) return 'Bìa sách';
    if (p === P.back) return 'Bìa sau';
    const ch = chapterOfPage(p);
    const where = ch !== null ? `Chương ${ch + 1}` : p <= P.toc ? 'Lời mở đầu' : 'Tổng kết';
    return `${where} · Trang ${p}/${P.count - 2}`;
  }

  // ---------- Điều hướng trang
  function goPage(p) {
    if (book.flip) {
      if (reduceMotion) book.flip.turnToPage(p); else book.flip.flip(p);
      if (reduceMotion) onPageChange(p);
    } else {
      // Dự phòng khi thư viện không tải được: cuộn ngang tới trang
      pageEls[p].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
      onPageChange(p);
    }
  }

  function onPageChange(p) {
    if (p !== book.page) measure('flip', { p });
    book.page = p;
    store.set('page', p);
    stopVoice();
    if (tale.playing && chapterOfPage(p) !== tale.i) stopTale();
    const ch = chapterOfPage(p);
    if (ch !== null && ch !== book.idx) { book.idx = ch; store.set('chapter', ch); moveIndicator(true); }
    if (ch !== null && !book.started.has(ch)) { book.started.add(ch); track('chapter_start', { chapter: ch + 1 }); }
    syncTabs();
    $('#flip-status').textContent = pageLabel(p);
    $('#flip-prev').disabled = p <= 0;
    $('#flip-next').disabled = p >= P.count - 1;
  }

  flipbookEl.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) { goPage(+go.dataset.goto); return; }
    const v = e.target.closest('[data-voice]');
    if (v) { voiceOver(v, +v.dataset.voice); return; }
    const t = e.target.closest('[data-tale]');
    if (t) { playTale(+t.dataset.tale); return; }
    const all = e.target.closest('[data-tale-all]');
    if (all) { stopTale(); finishTale(+all.dataset.taleAll, 'read'); }
  });
  $('#flip-prev').addEventListener('click', () => (book.flip ? book.flip.flipPrev() : goPage(Math.max(0, book.page - 1))));
  $('#flip-next').addEventListener('click', () => (book.flip ? book.flip.flipNext() : goPage(Math.min(P.count - 1, book.page + 1))));
  $('#flip-stage').addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); $('#flip-next').click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); $('#flip-prev').click(); }
  });

  function initFlipbook() {
    const PF = window.St && window.St.PageFlip;
    if (!PF) {
      $('#flip-stage').classList.add('is-fallback');
      onPageChange(book.page);
      return;
    }
    // Trang tỉ lệ 460:620 (điện thoại: 460:740 cho đủ chỗ lời kể),
    // cao tối đa vừa màn hình (trừ header và thanh điều khiển)
    const narrow = window.innerWidth < 600;
    const ph = narrow ? 740 : 620;
    const maxH = Math.max(440, Math.min(narrow ? 600 : 680, window.innerHeight - 140));
    book.flip = new PF(flipbookEl, {
      width: 460, height: ph, size: 'stretch',
      minWidth: 280, maxWidth: Math.round(maxH * 460 / ph), minHeight: 380, maxHeight: maxH,
      showCover: true, usePortrait: true, autoSize: true,
      drawShadow: true, maxShadowOpacity: 0.35,
      flippingTime: reduceMotion ? 1 : 900,
      mobileScrollSupport: true, disableFlipByClick: true, showPageCorners: !reduceMotion,
      swipeDistance: 30, startPage: book.page, startZIndex: 1
    });
    book.flip.loadFromHTML(pageEls);
    book.flip.on('flip', (e) => { sound.flip(); onPageChange(e.data); });
    book.flip.on('changeOrientation', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    $('#flip-stage').classList.add('is-ready');
    onPageChange(book.page);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  // Voice-over (PDF S02): ưu tiên file thu âm audio/chuong-N.mp3.
  // Chưa có file thì dùng giọng máy, nhưng CHỈ khi trình duyệt có giọng tiếng Việt
  // (Windows mặc định chỉ có giọng Anh: đọc chữ Việt bằng giọng Anh nghe rất sai).
  let speaking = false;
  let audioEl = null;
  let voiceBtn = null;
  const setVoiceLabel = (btn, on) => { if (btn && btn.isConnected) btn.querySelector('span').textContent = on ? 'Dừng đọc' : 'Nghe đọc'; };
  function stopVoice() {
    // Chỉ huỷ giọng máy khi đang đọc chương, để không cắt ngang câu chuyện đang kể
    if (speaking && 'speechSynthesis' in window) speechSynthesis.cancel();
    if (audioEl) { audioEl.pause(); audioEl = null; }
    if (speaking) setVoiceLabel(voiceBtn, false);
    speaking = false;
  }
  function viVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices().filter((v) => /^vi([-_]|$)/i.test(v.lang));
    // Giọng tự nhiên của Edge (HoaiMy, NamMinh) đọc hay hơn giọng cài sẵn
    return vs.find((v) => /natural|online/i.test(v.name)) || vs[0] || null;
  }
  // getVoices() có thể rỗng ở lần gọi đầu, danh sách tới qua sự kiện voiceschanged
  if ('speechSynthesis' in window) speechSynthesis.getVoices();

  function speakTTS(c, btn) {
    const voice = viVoice();
    if (!voice) {
      speaking = false; setVoiceLabel(btn, false);
      toast('Máy này chưa có giọng đọc tiếng Việt. Mở trang bằng Microsoft Edge để nghe giọng HoaiMy, hoặc thêm gói giọng nói tiếng Việt trong cài đặt Windows.', 'info', 'speaker-x');
      track('voice_unavailable');
      return;
    }
    const u = new SpeechSynthesisUtterance(c.title + '. ' + c.story);
    u.voice = voice; u.lang = voice.lang; u.rate = 0.95;
    u.onend = u.onerror = () => { speaking = false; setVoiceLabel(btn, false); };
    speechSynthesis.speak(u);
  }

  function voiceOver(btn, i) {
    if (speaking) { stopVoice(); return; }
    stopTale();
    const c = CHAPTERS[i];
    voiceBtn = btn; speaking = true; setVoiceLabel(btn, true);
    track('voice_play', { chapter: i + 1 });
    audioEl = new Audio(`audio/chuong-${i + 1}.mp3`);
    audioEl.onended = () => { speaking = false; audioEl = null; setVoiceLabel(btn, false); };
    audioEl.onerror = () => { audioEl = null; if (speaking) speakTTS(c, btn); };
    audioEl.play().catch(() => { /* lỗi tải file sẽ đi vào onerror */ });
  }

  // ------------------------------------------------------------ lắng nghe cuối chương
  // Góp ý của cô: khách hàng không thích dạng quiz, nên cuối mỗi chương là một câu chuyện để nghe.
  // Chạm vào một vật (bếp lửa, mâm cơm, nén hương, cá chép) để nghe một chuyện gia đình ngắn.
  // Âm thanh: ưu tiên file audio/ke-chuyen-N.mp3, rồi giọng tiếng Việt của trình duyệt;
  // máy không có giọng Việt thì lời kể hiện dần từng câu theo nhịp đọc. Nghe hết thì mở huy hiệu.
  const tale = { i: null, timers: [], audio: null, playing: false };

  function renderListen(i, done) {
    const c = CHAPTERS[i], L = c.listen;
    $('#game-' + i).innerHTML = `
      <div class="listen ${done ? 'is-done' : ''}">
        <p class="listen-prompt">${done ? 'Bạn đã nghe câu chuyện này.' : `Chạm vào ${L.object} để nghe một câu chuyện nhỏ.`}</p>
        <button class="listen-obj" type="button" data-tale="${i}" aria-label="${done ? 'Nghe lại' : 'Chạm để nghe'}: ${L.teller}">
          <span class="listen-ring" aria-hidden="true"></span><span class="listen-ring" aria-hidden="true"></span>
          <i class="ph-fill ph-${L.icon}" aria-hidden="true"></i>
        </button>
        <p class="listen-teller"><i class="ph ph-waveform" aria-hidden="true"></i> ${L.teller}</p>
        <ol class="listen-lines" id="lines-${i}">${L.lines.map((t) => `<li class="${done ? 'is-on' : ''}">${t}</li>`).join('')}</ol>
        <p class="listen-take ${done ? 'is-on' : ''}" id="take-${i}">${L.takeaway}</p>
        ${done
          ? `<button class="btn btn-primary" type="button" data-goto="${P.badge(i)}">Nhận huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`
          : `<button class="linklike listen-all" type="button" data-tale-all="${i}">Không nghe được? Đọc lời kể</button>`}
      </div>`;
  }

  function stopTale() {
    tale.timers.forEach(clearTimeout); tale.timers = [];
    if (tale.audio) { tale.audio.pause(); tale.audio = null; }
    if (tale.playing && 'speechSynthesis' in window) speechSynthesis.cancel();
    const obj = tale.i !== null && $(`[data-tale="${tale.i}"]`);
    if (obj) { obj.classList.remove('is-playing'); obj.closest('.listen').classList.remove('is-active'); }
    tale.playing = false; tale.i = null;
  }

  function showLine(i, k) {
    const li = $$(`#lines-${i} li`)[k];
    if (!li || li.classList.contains('is-on')) return;
    li.classList.add('is-on');
    if (hasGsap && !reduceMotion) gsap.from(li, { y: 10, opacity: 0, duration: 0.5, ease: 'power2.out' });
  }

  function finishTale(i, mode) {
    stopTale();
    const box = $(`[data-tale="${i}"]`);
    if (box) box.closest('.listen').classList.add('is-active');
    CHAPTERS[i].listen.lines.forEach((_, k) => showLine(i, k));
    const take = $('#take-' + i);
    if (take) {
      take.classList.add('is-on');
      if (hasGsap && !reduceMotion) gsap.from(take, { scale: 0.92, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' });
    }
    track('listen_complete', { chapter: i + 1, mode });
    if (i === 3) releaseLantern($(`[data-tale="${i}"]`) || take);
    setTimeout(() => completeChapter(i), 1400);
  }

  function playTale(i) {
    if (tale.playing) { const same = tale.i === i; stopTale(); if (same) return; }
    const L = CHAPTERS[i].listen;
    stopVoice();
    tale.i = i; tale.playing = true;
    $(`[data-tale="${i}"]`).classList.add('is-playing');
    $(`[data-tale="${i}"]`).closest('.listen').classList.add('is-active'); // nhường chỗ cho lời kể
    $$(`#lines-${i} li`).forEach((li) => li.classList.remove('is-on'));
    $('#take-' + i).classList.remove('is-on');
    track('listen_play', { chapter: i + 1 });

    // Lời kể hiện dần theo nhịp đọc (dùng khi không có âm thanh)
    const byText = () => {
      let t = 0;
      L.lines.forEach((line, k) => { tale.timers.push(setTimeout(() => showLine(i, k), t)); t += Math.max(2200, line.length * 55); });
      tale.timers.push(setTimeout(() => finishTale(i, 'text'), t));
    };
    // Giọng tiếng Việt của trình duyệt: đọc từng câu, câu nào đọc tới thì hiện câu đó
    const byVoice = () => {
      const voice = viVoice();
      if (!voice) { byText(); return; }
      L.lines.forEach((line, k) => {
        const u = new SpeechSynthesisUtterance(line);
        u.voice = voice; u.lang = voice.lang; u.rate = 0.92;
        u.onstart = () => showLine(i, k);
        if (k === L.lines.length - 1) u.onend = () => { if (tale.i === i) finishTale(i, 'voice'); };
        speechSynthesis.speak(u);
      });
    };
    // File thu âm: chia đều thời lượng cho từng câu
    const a = new Audio(`audio/ke-chuyen-${i + 1}.mp3`);
    tale.audio = a;
    a.onloadedmetadata = () => {
      const step = (a.duration * 1000) / L.lines.length;
      L.lines.forEach((_, k) => tale.timers.push(setTimeout(() => showLine(i, k), k * step)));
    };
    a.onended = () => { if (tale.i === i) finishTale(i, 'audio'); };
    a.onerror = () => { if (tale.audio === a) { tale.audio = null; byVoice(); } };
    a.play().catch(() => { /* lỗi tải file sẽ đi vào onerror */ });
  }

  function releaseLantern(fromEl) {
    if (!hasGsap || reduceMotion) return;
    const r = fromEl.getBoundingClientRect();
    for (let k = 0; k < 3; k++) {
      const l = document.createElement('div');
      l.className = 'lantern-fly';
      l.style.left = (r.left + r.width / 2 - 18 + (k - 1) * 40) + 'px';
      l.style.top = (r.top - 20) + 'px';
      document.body.appendChild(l);
      gsap.timeline({ onComplete: () => l.remove() })
        .to(l, { y: -(r.top + 120), duration: 3.2 + k * 0.4, ease: 'power1.in' }, k * 0.15)
        .to(l, { x: (k - 1) * 60 + gsap.utils.random(-30, 30), rotation: gsap.utils.random(-12, 12), duration: 3.2, ease: 'sine.inOut' }, k * 0.15)
        .to(l, { opacity: 0, scale: 0.5, duration: 1 }, 2.4 + k * 0.15);
    }
  }

  // Trang huy hiệu của chương
  function renderBadgePage(i, animate) {
    const c = CHAPTERS[i], on = book.done.has(i), last = i === CHAPTERS.length - 1;
    const pg = $('#badge-page-' + i);
    pg.innerHTML = `
      <p class="pg-kicker">Huy hiệu chương ${i + 1}</p>
      <div class="pg-medal ${on ? 'is-on' : ''}"><i class="ph${on ? '-fill' : ''} ph-${on ? 'medal' : 'lock-simple'}" aria-hidden="true"></i></div>
      <h3 class="pg-title">${c.badge.name}</h3>
      <p class="pg-prose">${on ? c.badge.desc : 'Nghe câu chuyện ở trang bên để mở huy hiệu này.'}</p>
      ${on ? (last
        ? `<button class="btn btn-primary" type="button" data-goto="${P.summary}">Xem bộ huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`
        : `<button class="btn btn-primary" type="button" data-goto="${P.art(i + 1)}">Sang chương ${i + 2} <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`)
        : `<button class="btn btn-ghost" type="button" data-goto="${P.game(i)}"><i class="ph ph-arrow-left" aria-hidden="true"></i> Về câu chuyện</button>`}`;
    if (animate && hasGsap && !reduceMotion) gsap.from($('.pg-medal', pg), { scale: 0.3, rotation: -40, duration: 0.7, ease: 'back.out(2)', delay: 0.2 });
  }

  function completeChapter(i) {
    const first = !book.done.has(i);
    book.done.add(i);
    store.set('chapters_done', [...book.done]);
    sound.chime();
    track('chapter_complete', { chapter: i + 1 });
    if (first) {
      measure('listen', { ch: i + 1 });
      track('badge_unlocked', { badge: CHAPTERS[i].badge.name });
      toast(`Bạn vừa mở ${CHAPTERS[i].badge.name}.`, 'gold', 'medal');
    }
    setTimeout(() => {
      renderListen(i, true);
      renderBadgePage(i, true);
      syncTabs();
      renderBadges();
    }, 0);
  }

  /* ======================================================================
   * S03 · Tổng kết 4 huy hiệu (trang 19–20 của sách)
   * ==================================================================== */
  function renderBadges() {
    $('#badges').innerHTML = CHAPTERS.map((c, i) => {
      const on = book.done.has(i);
      return `<button type="button" class="badge ${on ? 'is-unlocked' : ''}" data-badge="${i}" data-goto="${on ? P.badge(i) : P.art(i)}">
        <span class="disc"><i class="ph${on ? '-fill' : ''} ph-${on ? 'medal' : 'lock-simple'}" aria-hidden="true"></i></span>
        <h4>${c.badge.name}</h4>
        <p>${on ? c.badge.desc : 'Đọc chương ' + (i + 1) + ' để mở'}</p>
      </button>`;
    }).join('');
    const n = book.done.size;
    $('[data-summary-title]').textContent = n === 4 ? 'Bạn đã gom đủ bốn huy hiệu' : n === 0 ? 'Gom đủ bốn huy hiệu' : `Bạn đã có ${n}/4 huy hiệu`;
    $('[data-summary-text]').textContent = n === 4
      ? 'Hướng thiện, mái ấm, nếp nhà và tốt lành. Mang cả bốn giá trị ấy đến sự kiện và đóng dấu ở bốn trạm nhé.'
      : 'Bốn trạm thực tế đang chờ bạn đóng dấu và nhận quà.';
    if (typeof renderLetter === 'function' && $('#letter-lock')) renderLetter();
  }

  /* ======================================================================
   * S04–S06 · PASSPORT O2O
   * ==================================================================== */
  const STATIONS = [
    { id: 1, name: 'Trạm Hướng Thiện', code: 'HUONG1' },
    { id: 2, name: 'Trạm Mái Ấm', code: 'MAIAM2' },
    { id: 3, name: 'Trạm Nếp Nhà', code: 'NEPNH3' },
    { id: 4, name: 'Trạm Tốt Lành', code: 'TOTLA4' }
  ];
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (0/O, 1/I/L)
  const randCode = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

  let pass = store.get('pass', null); // { id, nickname, email?, consent, stamps:[], giftCode, claimed, synced, offlineId?, spins?, serverPrizes?, given? }

  /* Thẻ trên máy chủ: staff quét QR hộ chiếu để đóng dấu (trang staff.html).
   * Khi /api/pass trả lời được (đã nối kho dữ liệu) thì server.on = true: người chơi không tự đóng dấu,
   * điện thoại hỏi máy chủ vài giây một lần để nhận dấu mới, quà vòng quay (máy chủ bốc) và quà đã trao.
   * Chưa nối máy chủ (chạy ở máy, chưa cấu hình) thì giữ cách tự nhập mã trạm để demo. */
  const server = { on: false, busy: false, timer: 0 };
  const isJson = (r) => (r.headers.get('content-type') || '').includes('json');
  function setServer(on) {
    if (server.on === on) return;
    server.on = on;
    const fc = $('#form-code'), hint = $('#pp-staff-hint');
    if (fc) fc.hidden = on;
    if (hint) hint.hidden = !on;
    renderCheckout();
  }
  async function pushPass(tries = 0) {
    if (!pass || !pass.synced) return false;
    try {
      const r = await fetch('/api/pass', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: pass.id, name: pass.nickname, vid: meter.vid, gift: pass.giftCode }) });
      if (!isJson(r)) return false;
      // Mã trùng với thẻ của người khác (rất hiếm): đổi mã rồi gửi lại
      if (r.status === 409 && tries < 3) { pass.id = 'TAO-' + randCode(6); store.set('pass', pass); renderTicket(); return pushPass(tries + 1); }
      if (!r.ok) return false;
      mergeServer(await r.json());
      return true;
    } catch (e) { return false; }
  }
  async function pullPass() {
    if (!pass || !pass.synced || server.busy || !navigator.onLine) return;
    server.busy = true;
    try {
      const r = await fetch('/api/pass?id=' + encodeURIComponent(pass.id), { cache: 'no-store' });
      if (r.status === 404 && isJson(r)) setServer(await pushPass());
      else if (r.ok && isJson(r)) { setServer(true); mergeServer(await r.json()); }
      else setServer(false);
    } catch (e) { /* mất mạng: thử lại lần sau */ }
    server.busy = false;
  }
  // Nhận dữ liệu máy chủ: dấu mới thì lật tới trang visa và đóng dấu như lúc tự quét
  function mergeServer(v) {
    if (!v || !pass || v.pid !== pass.id) return;
    const beforeGiven = JSON.stringify(pass.given || {}), wasClaimed = pass.claimed;
    pass.serverPrizes = v.prizes || {};
    pass.given = v.given || {};
    if (v.claimed) pass.claimed = true;
    const fresh = Object.keys(v.stamps || {}).map(Number).filter((st) => !pass.stamps.includes(st)).sort((a, b) => a - b);
    store.set('pass', pass);
    // Nhiều dấu cùng lúc (máy vừa có mạng lại): ghi im lặng các dấu trước, chỉ diễn hoạt cảnh dấu cuối
    fresh.slice(0, -1).forEach((st) => { pass.stamps.push(st); pass.stampedAt = Object.assign({}, pass.stampedAt, { [st]: v.stamps[st] }); });
    if (fresh.length) { doStamp(fresh[fresh.length - 1], v.stamps[fresh[fresh.length - 1]], true); return; }
    if (JSON.stringify(pass.given) !== beforeGiven) ppRefresh([3, 4, 5, 6]);
    if (pass.claimed && !wasClaimed) { renderCheckout(); toast('Nhân sự đã xác nhận trao quà cuối. Chúc bạn năm mới thật ấm!', 'gold', 'gift'); }
  }
  // Hỏi máy chủ 6 giây một lần, chỉ khi phần hộ chiếu đang hiện trên màn hình (lúc đưa QR cho staff),
  // trang không bị ẩn, và thẻ còn việc chờ (chưa đủ dấu hoặc chưa nhận quà cuối). Giữ số lệnh trong gói Upstash miễn phí.
  server.inView = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      server.inView = es.some((e) => e.isIntersecting);
      if (server.inView) pullPass();
    }).observe($('#tram-trai-nghiem'));
  } else server.inView = true;
  const waiting = () => pass && (pass.stamps.length < 4 || !pass.claimed);
  function startPolling() {
    clearInterval(server.timer);
    server.timer = setInterval(() => {
      if (document.visibilityState === 'visible' && server.inView && waiting()) pullPass();
    }, 6000);
    pullPass();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && server.inView && waiting()) pullPass(); });

  // Thẻ tạo trước (ở nhà hoặc tại cổng); dấu trạm chỉ có khi quét mã ở trạm tại sự kiện.
  // QR ở cổng (?vao=CONG23) chỉ ghi nhận đã check-in sự kiện, không chặn việc tạo thẻ.
  const GATE_CODE = 'CONG23';
  const checkedIn = () => Boolean(store.get('checkin', null));
  function renderRegister() {
    const has = Boolean(pass) && !store.get('new_pass', false);
    $('#register-open').hidden = has;
    const box = $('#register-has');
    box.hidden = !has;
    if (!has) return;
    // Đã có thẻ: không cho tạo đè (mất dấu đã đóng) trừ khi xác nhận
    box.innerHTML = `
      <span class="gate-ico" aria-hidden="true"><i class="ph ph-identification-card"></i></span>
      <h3>Bạn đã có thẻ thông hành</h3>
      <p class="lead">Mã thẻ <strong class="mono">${esc(pass.id)}</strong> mang tên <strong>${esc(pass.nickname)}</strong>, đã đóng ${pass.stamps.length}/4 dấu. Hộ chiếu ở bên cạnh.</p>
      <button class="linklike" type="button" id="btn-new-pass">Không phải bạn? Tạo thẻ khác</button>`;
    $('#btn-new-pass').addEventListener('click', async () => {
      const v = await ask({
        tone: 'danger',
        title: 'Tạo thẻ khác trên máy này?',
        html: `<p>Thẻ <strong>${esc(pass.id)}</strong> cùng ${pass.stamps.length}/4 dấu sẽ không còn trên máy này. Nên chụp lại mã thẻ trước để nhân sự hỗ trợ lấy lại khi cần.</p>`,
        buttons: [{ label: 'Giữ thẻ hiện tại', value: 'cancel', cls: 'btn-primary' }, { label: 'Tạo thẻ khác', value: 'ok', cls: 'btn-danger' }]
      });
      if (v !== 'ok') return;
      store.set('new_pass', true);
      track('new_pass_requested');
      renderRegister();
      $('#f-nickname').focus();
    });
  }
  function enterGate(raw) {
    if (String(raw || '').trim().toUpperCase() !== GATE_CODE) return;
    if (!checkedIn()) {
      store.set('checkin', { at: Date.now() }); track('gate_checkin'); measure('checkin');
      if (pass) ppRefresh([PP.data]);
    }
    toast(pass ? 'Chào mừng bạn đến sự kiện. Đưa hộ chiếu đi quét mã ở bốn trạm nhé.' : 'Chào mừng bạn đến sự kiện. Tạo thẻ thông hành rồi đi quét mã ở bốn trạm nhé.', 'ok', 'door-open');
    setTimeout(() => {
      $(pass ? '#ticket-slot' : '#register').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (!pass) $('#f-nickname').focus({ preventScroll: true });
    }, 400);
  }

  // Trùng nickname (góp ý 4b). Bản thử nghiệm chưa có máy chủ: danh sách tên đã có là dữ liệu giả lập
  // + tên đã đăng ký trên máy này. Khi có API thì thay isTaken bằng lệnh hỏi máy chủ.
  const DEMO_TAKEN = ['MINH', 'BE NA', 'NA', 'AN', 'LAN', 'MINH KHOI', 'KHOI', 'TAO', 'NGOC', 'LINH'];
  const isTaken = (name) => DEMO_TAKEN.includes(plain(name)) || store.get('registry', []).includes(plain(name));
  const withSuffix = (name) => name.slice(0, 18).trim() + '_' + String(Math.floor(1000 + Math.random() * 9000));

  // Thẻ tạo lúc mất mạng (góp ý 4a): mã tiền tố OFF- để nhân sự nhận ra ngay.
  // Có mạng lại thì máy chủ cấp mã TAO- chính thức (giữ phần đuôi), mã OFF- cũ vẫn tra cứu được.
  function syncPass() {
    if (!pass || pass.synced || !navigator.onLine) return;
    const old = pass.id;
    pass.offlineId = old;
    pass.id = 'TAO-' + old.slice(4);
    pass.synced = true;
    let renamed = false;
    if (isTaken(pass.nickname)) { pass.nickname = withSuffix(pass.nickname); renamed = true; }
    store.set('pass', pass);
    store.set('registry', [...new Set([...store.get('registry', []), plain(pass.nickname)])]);
    track('offline_id_synced', { renamed });
    renderTicket();
    renderRegister();
    startPolling();
    toast(`Đã đồng bộ thẻ. Mã chính thức của bạn: ${pass.id}.` + (renamed ? ` Tên bị trùng nên được đổi thành "${esc(pass.nickname)}".` : ''), 'ok', 'wifi-high');
  }

  // Validate khi rời ô (UI/UX Pro Max: inline validation on blur)
  const fName = $('#f-nickname'), fEmail = $('#f-email'), fConsent = $('#f-consent');
  function validateName() {
    const v = fName.value.trim();
    const msg = !v ? 'Bạn nhập một cái tên để in lên thẻ nhé.' : v.length < 2 ? 'Tên cần ít nhất 2 ký tự.' : '';
    setFieldError(fName, $('#f-nickname-err'), msg); return !msg;
  }
  function validateEmail() {
    const v = fEmail.value.trim();
    const msg = v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Email chưa đúng định dạng, ví dụ: ban@email.com' : '';
    setFieldError(fEmail, $('#f-email-err'), msg); return !msg;
  }
  function setFieldError(input, out, msg) {
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    out.innerHTML = msg ? `<i class="ph ph-warning-circle" aria-hidden="true"></i>${msg}` : '';
  }
  fName.addEventListener('blur', validateName);
  fEmail.addEventListener('blur', validateEmail);
  fName.addEventListener('input', () => { if (fName.getAttribute('aria-invalid') === 'true') validateName(); });
  fEmail.addEventListener('input', () => { if (fEmail.getAttribute('aria-invalid') === 'true') validateEmail(); });

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const okName = validateName(), okEmail = validateEmail();
    const summary = $('#error-summary');
    if (!okName || !okEmail) {
      const items = [];
      if (!okName) items.push('<a href="#f-nickname">Nhập tên hoặc nickname</a>');
      if (!okEmail) items.push('<a href="#f-email">Kiểm tra lại email</a>');
      $('#error-summary-list').innerHTML = items.join('');
      summary.hidden = false; summary.focus();
      return;
    }
    summary.hidden = true;
    let nickname = fName.value.trim();
    const offline = !navigator.onLine;
    // Có mạng mới kiểm tra trùng được; mất mạng thì kiểm tra lúc đồng bộ
    if (!offline && isTaken(nickname)) {
      const suffix = withSuffix(nickname);
      const choice = await ask({
        title: `Tên “${esc(nickname)}” đã có người dùng`,
        html: `<p>Nếu <strong>bạn đã từng tạo thẻ</strong>, hãy lấy lại thẻ cũ để giữ các dấu trạm đã đóng.</p>
          <p>Nếu <strong>bạn là người mới</strong>, dùng tên có thêm số để nhân sự không nhầm hai người:</p>
          <p class="dlg-chip">${esc(suffix)}</p>`,
        buttons: [
          { label: 'Đổi tên khác', value: 'edit', cls: 'btn-quiet' },
          { label: 'Lấy lại thẻ cũ', value: 'restore', cls: 'btn-ghost' },
          { label: `Dùng tên ${esc(suffix)}`, value: 'suffix', cls: 'btn-primary' }
        ]
      });
      track('nickname_conflict', { choice: choice || 'dismiss' });
      if (choice === 'restore') { openRestore(); return; }
      if (choice !== 'suffix') { fName.focus(); fName.select(); return; }
      nickname = suffix;
    }
    const btn = $('#btn-register');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Đang tạo thẻ…</span>';

    const consent = fConsent.checked;
    const email = fEmail.value.trim();
    // Mô phỏng gọi máy chủ; mất mạng thì tạo ID cục bộ và đồng bộ sau (PDF A3)
    setTimeout(() => {
      pass = {
        id: (offline ? 'OFF-' : 'TAO-') + randCode(6),
        nickname,
        email: consent && email ? email : null, // từ chối consent: không lưu email
        consent,
        stamps: [],
        giftCode: 'QUA-' + randCode(4),
        claimed: false,
        synced: !offline
      };
      store.set('pass', pass);
      if (!offline) store.set('registry', [...new Set([...store.get('registry', []), plain(nickname)])]);
      measure('register');
      store.set('new_pass', false);
      renderRegister();
      startPolling();
      track('form_submit');
      track(consent ? 'consent_accepted' : 'consent_declined');
      track('virtual_id_created', { offline });
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-label">Tạo thẻ thông hành</span>';
      if (offline) toast(`Đang mất mạng nên thẻ được tạo trên máy với mã ${pass.id}. Có mạng lại, thẻ tự đồng bộ sang mã chính thức.`, 'info', 'wifi-slash');
      else if (!consent && email) toast('Thẻ đã sẵn sàng. Vì bạn chưa đồng ý, chúng tôi không lưu email.', 'ok');
      else toast('Thẻ thông hành đã sẵn sàng. Đưa mã QR cho nhân sự ở mỗi trạm nhé.', 'ok', 'identification-card');
      $('#form-register').reset();
      renderTicket(true);
      if (window.innerWidth < 1000) $('#ticket-slot').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      const pending = store.get('pending_stamp', null);
      if (pending) { store.set('pending_stamp', null); setTimeout(() => addStamp(pending), 1800); }
    }, 700);
  });

  // Lấy lại thẻ cũ bằng email hoặc mã thẻ (góp ý 4b, PDF A7). Bản thật sẽ tra trên máy chủ.
  async function openRestore() {
    const p = ask({
      title: 'Lấy lại thẻ đã tạo',
      html: `<p>Nhập <strong>email</strong> bạn dùng khi đăng ký, hoặc <strong>mã thẻ</strong> (dạng TAO-XXXXXX hoặc OFF-XXXXXX).</p>
        <label class="dlg-label" for="dlg-restore">Email hoặc mã thẻ</label>
        <input class="input" id="dlg-restore" autocomplete="off" spellcheck="false" placeholder="ban@email.com hoặc TAO-ABC123">
        <p class="error-text" id="dlg-restore-err" aria-live="polite"></p>`,
      buttons: [{ label: 'Huỷ', value: 'cancel', cls: 'btn-quiet' }, { label: 'Lấy lại thẻ', value: 'ok', cls: 'btn-primary', id: 'dlg-restore-ok' }]
    });
    const input = $('#dlg-restore');
    input.focus();
    // Kiểm tra định dạng trước khi đóng hộp thoại
    $('#dlg-restore-ok').addEventListener('click', (e) => {
      const v = input.value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || /^(TAO|OFF)-[A-Z0-9]{6}$/i.test(v);
      if (!ok) { e.preventDefault(); $('#dlg-restore-err').innerHTML = '<i class="ph ph-warning-circle" aria-hidden="true"></i>Email chưa đúng, hoặc mã thẻ chưa đủ dạng TAO- và 6 ký tự.'; input.focus(); }
    });
    if (await p !== 'ok') return;
    const v = input.value.trim();
    const isEmail = v.includes('@');
    track('restore_request', { by: isEmail ? 'email' : 'code' });
    if (!isEmail && pass && (pass.id === v.toUpperCase() || pass.offlineId === v.toUpperCase())) { toast('Thẻ này đang mở trên máy rồi.', 'info'); return; }
    toast(isEmail
      ? 'Nếu email này đã đăng ký, chúng tôi sẽ gửi đường dẫn lấy lại thẻ vào hộp thư. Bản thử nghiệm chưa gửi được thư, nhân sự check-in sẽ hỗ trợ bạn.'
      : 'Bản thử nghiệm chưa kết nối máy chủ nên chưa tải lại được thẻ. Đưa mã này cho nhân sự check-in để được hỗ trợ.', 'info', 'lifebuoy');
  }
  $('#btn-restore').addEventListener('click', openRestore);

  // ----------------------------------------------------------------------
  // Hộ chiếu thông hành (lật trang, StPageFlip). 10 trang:
  //   0 bìa · 1 thông tin chủ thẻ + QR · 2 hành trình 4 trạm
  //   3–6 trang visa của từng trạm · 7 hoàn thành · 8 ghi chú · 9 bìa sau
  // Đóng dấu ở trạm nào → hộ chiếu lật tới trang visa của trạm đó, dấu mực đóng xuống.
  // ----------------------------------------------------------------------
  const PP = { cover: 0, data: 1, guide: 2, visa: (id) => 2 + id, done: 7, notes: 8, back: 9, count: 10 };
  const ROMAN_ST = ['I', 'II', 'III', 'IV'];
  const STAMP_STYLE = {
    1: { shape: 'circle', ink: '#b3261e', short: 'HƯỚNG THIỆN', rot: -13, x: 14, y: 6 },
    2: { shape: 'rect', ink: '#1f4e8c', short: 'MÁI ẤM', rot: 7, x: -10, y: 18 },
    3: { shape: 'octagon', ink: '#2e6b3f', short: 'NẾP NHÀ', rot: -5, x: 6, y: -6 },
    4: { shape: 'oval', ink: '#6a2c8a', short: 'TỐT LÀNH', rot: 11, x: -8, y: 10 }
  };
  const VISA_TEXT = {
    1: 'Tự soi xét và hướng thiện. Nhìn lại một năm bằng sự thật lòng.',
    2: 'Gìn giữ mái ấm và hòa thuận. Giữ lửa bằng lắng nghe và bao dung.',
    3: 'Thành kính và trân trọng nếp nhà. Nhớ điều ông bà trao lại.',
    4: 'Khát vọng vươn lên. Mang điều tốt lành đi tiếp sang năm mới.'
  };
  const pp = { flip: null, pageEls: [], timers: [] };

  const fmtDate = (ts, withTime) => {
    const d = new Date(ts || Date.now());
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}` + (withTime ? ` ${p(d.getHours())}:${p(d.getMinutes())}` : '');
  };

  // Con dấu visa bằng SVG: mỗi trạm một hình, một màu mực, nét mực loang và sờn
  function stampSVG(id, ts) {
    const s = STAMP_STYLE[id], ink = s.ink, f = `ink-${id}-${(ts || 0) % 1000}`;
    const date = fmtDate(ts), roman = ROMAN_ST[id - 1];
    const T = (x, y, size, text, w = 800, ls = 1.5) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Be Vietnam Pro, Arial, sans-serif" font-size="${size}" font-weight="${w}" letter-spacing="${ls}" fill="${ink}">${text}</text>`;
    let body = '';
    if (s.shape === 'circle') {
      body = `<circle cx="100" cy="100" r="84" fill="none" stroke="${ink}" stroke-width="5"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke="${ink}" stroke-width="1.6"/>
        <path id="arc-${f}" d="M 34 100 A 66 66 0 0 1 166 100" fill="none"/>
        <text font-family="Be Vietnam Pro, Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.8" fill="${ink}"><textPath href="#arc-${f}" startOffset="50%" text-anchor="middle">CHUYỆN NHÀ TÁO · TRẠM ${roman}</textPath></text>
        ${T(100, 104, 15.5, s.short, 800, 0.4)}${T(100, 125, 12.5, date, 600, 1)}${T(100, 146, 9.5, '★ ĐÃ ĐÓNG DẤU ★', 700, 1.2)}`;
    } else if (s.shape === 'rect') {
      body = `<rect x="14" y="40" width="172" height="120" rx="6" fill="none" stroke="${ink}" stroke-width="5"/>
        <rect x="24" y="50" width="152" height="100" rx="3" fill="none" stroke="${ink}" stroke-width="1.6"/>
        ${T(100, 72, 12, 'VISA · TRẠM ' + roman, 700, 2.5)}${T(100, 104, 24, s.short)}
        <line x1="40" y1="114" x2="160" y2="114" stroke="${ink}" stroke-width="1.4"/>${T(100, 132, 13, date, 600, 1)}${T(100, 146, 9, 'CHUYỆN NHÀ TÁO', 700, 2)}`;
    } else if (s.shape === 'octagon') {
      body = `<polygon points="66,20 134,20 180,66 180,134 134,180 66,180 20,134 20,66" fill="none" stroke="${ink}" stroke-width="5"/>
        <polygon points="72,32 128,32 168,72 168,128 128,168 72,168 32,128 32,72" fill="none" stroke="${ink}" stroke-width="1.6"/>
        ${T(100, 64, 12, 'TRẠM ' + roman, 700, 3)}${T(100, 102, 22, s.short)}${T(100, 124, 13, date, 600, 1)}${T(100, 146, 10, 'ĐÃ ĐÓNG DẤU', 700, 2)}`;
    } else {
      body = `<ellipse cx="100" cy="100" rx="88" ry="62" fill="none" stroke="${ink}" stroke-width="5"/>
        <ellipse cx="100" cy="100" rx="76" ry="50" fill="none" stroke="${ink}" stroke-width="1.6"/>
        ${T(100, 76, 11, 'CHUYỆN NHÀ TÁO · ' + roman, 700, 2)}${T(100, 104, 22, s.short)}${T(100, 125, 13, date, 600, 1)}`;
    }
    return `<svg class="pp-stamp-svg" viewBox="0 0 200 200" role="img" aria-label="Dấu ${s.short}, ngày ${date}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="${f}" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="${id * 7}" result="t"/>
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="holes"/>
        <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn"/>
        <feDisplacementMap in="worn" in2="t" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
      </filter></defs>
      <g filter="url(#${f})" opacity=".88">${body}</g></svg>`;
  }

  function goldStampSVG(ts) {
    const ink = '#a87b16';
    return `<svg class="pp-stamp-svg" viewBox="0 0 200 200" role="img" aria-label="Dấu hoàn thành bốn trạm" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="ink-gold"><feTurbulence type="fractalNoise" baseFrequency="1" numOctaves="2" seed="11" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.8" result="h"/><feComposite in="SourceGraphic" in2="h" operator="in"/></filter></defs>
      <g filter="url(#ink-gold)">
        <circle cx="100" cy="100" r="88" fill="none" stroke="${ink}" stroke-width="4" stroke-dasharray="2 4"/>
        <circle cx="100" cy="100" r="78" fill="none" stroke="${ink}" stroke-width="5"/>
        <circle cx="100" cy="100" r="66" fill="none" stroke="${ink}" stroke-width="1.6"/>
        <text x="100" y="84" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="12" font-weight="700" letter-spacing="2.5" fill="${ink}">HOÀN THÀNH</text>
        <text x="100" y="116" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="32" font-weight="800" fill="${ink}">4/4</text>
        <text x="100" y="138" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="12" font-weight="600" fill="${ink}">${fmtDate(ts)}</text>
      </g></svg>`;
  }

  const stampedAt = (id) => (pass.stampedAt && pass.stampedAt[id]) || null;

  function ppHead(left, right) { return `<div class="pp-head"><span>${left}</span><span>${right}</span></div>`; }

  function ppPageHTML(n) {
    const total = pass.stamps.length;
    if (n === PP.cover) return `
      <div class="pp-cover">
        <p class="pp-cover-top">CHUYỆN NHÀ TÁO</p>
        <div class="pp-emblem" aria-hidden="true">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" stroke-width="1.2"/>
          ${[0, 1, 2, 3, 4].map((k) => { const a = (-150 + k * 30) * Math.PI / 180; return `<text x="${60 + 36 * Math.cos(a)}" y="${60 + 36 * Math.sin(a) + 4}" text-anchor="middle" font-size="11" fill="currentColor">★</text>`; }).join('')}
          <text x="60" y="74" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="26" font-weight="800" fill="currentColor">Táo</text></svg>
        </div>
        <p class="pp-cover-title">THẺ THÔNG HÀNH</p>
        <p class="pp-cover-sub">PASSPORT · ĐÊM 23 THÁNG CHẠP</p>
        <span class="pp-chip" aria-hidden="true"><svg viewBox="0 0 48 32"><rect x="1.5" y="1.5" width="45" height="29" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="1.5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/><line x1="31" y1="16" x2="46.5" y2="16" stroke="currentColor" stroke-width="2"/></svg></span>
      </div>`;
    if (n === PP.data) {
      const nameMRZ = pass.nickname.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'D').toUpperCase().replace(/[^A-Z0-9]+/g, '<');
      const l1 = ('P<TAO<<' + nameMRZ + '<'.repeat(44)).slice(0, 44);
      const l2 = (pass.id.replace('-', '') + '<<VNM' + fmtDate(pass.issuedAt).replace(/\./g, '') + '<<' + total + '/4' + '<'.repeat(44)).slice(0, 44);
      return `<div class="pp-page">
        ${ppHead('THẺ THÔNG HÀNH', 'TRANG THÔNG TIN')}
        <div class="pp-data">
          <div class="pp-photo" aria-hidden="true">${esc(pass.nickname.trim().charAt(0).toUpperCase())}</div>
          <dl class="pp-fields">
            <div><dt>Họ tên / Nickname</dt><dd>${esc(pass.nickname)}</dd></div>
            <div><dt>Mã thẻ</dt><dd class="mono">${pass.id}${pass.synced ? '' : '<span class="pp-off" title="Tạo khi mất mạng, chưa đồng bộ">CHƯA ĐỒNG BỘ</span>'}</dd></div>
            <div><dt>Ngày cấp</dt><dd>${fmtDate(pass.issuedAt)}</dd></div>
            <div><dt>Nơi cấp</dt><dd>Bếp lửa nhà mình</dd></div>
          </dl>
        </div>
        <div class="pp-qr-row">
          <div class="pp-qr" id="pp-qr" role="img" aria-label="Mã QR của thẻ ${pass.id}"></div>
          <p>${pass.synced ? (checkedIn() ? 'Đã check-in sự kiện. Quét mã ở mỗi trạm để đóng dấu.' : 'Đến sự kiện, quét mã ở mỗi trạm để đóng dấu.') : 'Thẻ tạo lúc mất mạng (mã OFF-). Nhân sự vẫn quét và đóng dấu được, thẻ tự đồng bộ khi có mạng.'}</p>
        </div>
        <div class="pp-mrz" aria-hidden="true"><span>${esc(l1)}</span><span>${esc(l2)}</span></div>
      </div>`;
    }
    if (n === PP.guide) return `<div class="pp-page">
        ${ppHead('HÀNH TRÌNH', 'TRANG 2')}
        <h4 class="pp-title">Bốn trạm, bốn dấu</h4>
        <p class="pp-note">Mỗi trạm đóng một dấu vào trang visa riêng và được quay thưởng một lần. Đủ bốn dấu thì nhận quà ở bàn check-out.</p>
        <ol class="pp-route">${STATIONS.map((s) => {
          const on = pass.stamps.includes(s.id);
          return `<li class="${on ? 'is-on' : ''}"><button type="button" data-ppgo="${PP.visa(s.id)}">
            <span class="pp-route-n">${ROMAN_ST[s.id - 1]}</span>
            <span class="pp-route-t">${s.name}<small>${on ? 'Đã đóng dấu ' + fmtDate(stampedAt(s.id), true) : 'Chưa đóng dấu'}</small></span>
            <i class="ph${on ? '-fill' : ''} ph-${on ? 'seal-check' : 'circle-dashed'}" aria-hidden="true"></i></button></li>`;
        }).join('')}</ol>
        <p class="pp-progress"><strong>${total}/4</strong> trạm đã đóng dấu</p>
      </div>`;
    const id = n - 2;
    if (id >= 1 && id <= 4) {
      const s = STATIONS[id - 1], on = pass.stamps.includes(id), st = STAMP_STYLE[id], photo = moments[String(id)], spin = spinOf(id);
      return `<div class="pp-page pp-visa" style="--ink:${st.ink}">
        ${ppHead('VISA · TRẠM ' + ROMAN_ST[id - 1], 'TRANG ' + n)}
        <h4 class="pp-title">${s.name}</h4>
        <p class="pp-note">${VISA_TEXT[id]}</p>
        <div class="pp-stamp-zone ${on ? 'is-on' : ''} ${on && photo ? 'has-photo' : ''}" data-zone="${id}">
          ${on
            ? `<div class="pp-stamp" data-stamp="${id}" style="--rot:${st.rot}deg;--dx:${st.x}px;--dy:${st.y}px">${stampSVG(id, stampedAt(id))}</div>`
            : `<p class="pp-empty"><i class="ph ph-stamp" aria-hidden="true"></i>Chỗ đóng dấu<small>Đến ${s.name} và đưa mã QR cho nhân sự</small></p>`}
          ${on && photo ? `<figure class="pp-polaroid" style="--r:${id % 2 ? 4 : -5}deg"><img src="${photo}" alt="Khoảnh khắc ở ${s.name}"><button class="pp-polaroid-btn" type="button" data-moment="${id}" aria-label="Đổi ảnh khoảnh khắc ở ${s.name}"><i class="ph ph-camera" aria-hidden="true"></i></button></figure>` : ''}
        </div>
        ${on ? `<div class="pp-visa-foot">
          ${spin ? `<p class="pp-prize ${spin.prize === 'none' ? 'is-miss' : ''}"><i class="ph-fill ph-${PRIZES[spin.prize].icon}" aria-hidden="true"></i>${PRIZES[spin.prize].label}${pass.given && pass.given[id] && spin.prize !== 'none' ? ' · đã nhận' : ''}</p>`
            : `<button class="pp-photo-add pp-spin" type="button" data-spin="${id}"><i class="ph ph-spiral" aria-hidden="true"></i> Quay thưởng</button>`}
          ${photo ? '' : `<button class="pp-photo-add" type="button" data-moment="${id}"><i class="ph ph-camera-plus" aria-hidden="true"></i> Lưu ảnh</button>`}
        </div>` : ''}
      </div>`;
    }
    if (n === PP.done) return `<div class="pp-page">
        ${ppHead('HOÀN THÀNH', 'TRANG 7')}
        <h4 class="pp-title">${total === 4 ? 'Bạn đã đi đủ bốn trạm' : `Còn ${4 - total} trạm nữa`}</h4>
        <div class="pp-stamp-zone ${total === 4 ? 'is-on' : ''}">
          ${total === 4
            ? `<div class="pp-stamp pp-gold" data-stamp="gold" style="--rot:-8deg;--dx:0px;--dy:0px">${goldStampSVG(Math.max(...STATIONS.map((s) => stampedAt(s.id) || 0)))}</div>`
            : `<p class="pp-empty"><i class="ph ph-medal" aria-hidden="true"></i>Dấu hoàn thành<small>Sẽ hiện khi đủ bốn dấu</small></p>`}
        </div>
        <p class="pp-note">${total === 4 ? 'Mời bạn đến bàn check-out, đưa mã nhận quà bên dưới cho nhân sự.' : 'Mỗi trạm chỉ đóng dấu một lần.'}</p>
      </div>`;
    if (n === PP.notes) return `<div class="pp-page pp-notes">
        ${ppHead('GHI CHÚ', 'TRANG 8')}
        <p class="pp-note">Ở mỗi trang visa, bạn lưu được một ảnh khoảnh khắc của trạm đó. Đủ bốn dấu, các ảnh sẽ được dán vào lá sớ gửi Táo.</p>
        <div class="pp-lines" aria-hidden="true">${'<span></span>'.repeat(9)}</div>
      </div>`;
    return `<div class="pp-cover pp-cover-back"><div class="pp-emblem pp-emblem-sm" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="3"/><text x="60" y="72" text-anchor="middle" font-family="Be Vietnam Pro, Arial" font-size="26" font-weight="800" fill="currentColor">Táo</text></svg></div><p class="pp-cover-sub">#ChuyenNhaTao</p></div>`;
  }

  function ppStatus(p) {
    const label = p === PP.cover ? 'Bìa hộ chiếu' : p === PP.back ? 'Bìa sau' : p === PP.data ? 'Trang thông tin' : p === PP.guide ? 'Hành trình 4 trạm'
      : p <= 6 ? `Visa ${STATIONS[p - 3].name}` : p === PP.done ? 'Hoàn thành' : 'Ghi chú';
    $('#pp-status').textContent = label;
    $('#pp-prev').disabled = p <= 0;
    $('#pp-next').disabled = p >= PP.count - 1;
    store.set('pp_page', p);
  }

  function ppRefresh(pages) {
    pages.forEach((n) => { if (pp.pageEls[n]) pp.pageEls[n].innerHTML = ppPageHTML(n); });
    if (pages.includes(PP.data)) ppQR();
  }
  function ppQR() {
    const el = $('#pp-qr');
    if (!el) return;
    if (typeof QRCode !== 'undefined') new QRCode(el, { text: location.origin + '/?the=' + pass.id, width: 112, height: 112, colorDark: '#1b120c', colorLight: '#fffdf7', correctLevel: QRCode.CorrectLevel.M });
    else el.innerHTML = `<span class="mono" style="font-size:11px">${pass.id}</span>`;
  }

  function ppGo(p) {
    if (pp.flip) { if (reduceMotion) { pp.flip.turnToPage(p); ppStatus(p); } else pp.flip.flip(p); }
    else { pp.pageEls[p].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }); ppStatus(p); }
  }

  function destroyPassport() {
    if (pp.flip) { try { pp.flip.destroy(); } catch (e) { /* bỏ qua */ } }
    pp.flip = null; pp.pageEls = [];
  }

  function renderTicket(animate) {
    const slot = $('#ticket-slot');
    if (!pass) {
      destroyPassport();
      slot.innerHTML = `<div class="ticket ticket-empty">
        <i class="ph ph-identification-card" aria-hidden="true"></i>
        <strong>Hộ chiếu của bạn sẽ hiện ở đây</strong>
        <span>Gồm mã QR riêng và bốn trang visa để đóng dấu ở bốn trạm.</span>
        <div style="display:grid;gap:8px;width:100%;max-width:260px;margin-top:8px" aria-hidden="true">
          <div class="skeleton" style="height:12px"></div><div class="skeleton" style="height:12px;width:70%"></div>
        </div></div>`;
      $('#checkout').hidden = true;
      return;
    }
    if (!pass.issuedAt) { pass.issuedAt = Date.now(); store.set('pass', pass); }
    destroyPassport();
    const n = pass.stamps.length;
    slot.innerHTML = `
      <div class="pp-stage" id="pp-stage" tabindex="0" aria-roledescription="hộ chiếu lật trang" aria-label="Hộ chiếu thông hành. Dùng phím mũi tên để lật trang.">
        <div class="pp-book" id="pp-book"></div>
      </div>
      <div class="flip-controls pp-controls">
        <button class="icon-btn" type="button" id="pp-prev" aria-label="Trang trước"><i class="ph ph-caret-left" aria-hidden="true"></i></button>
        <p class="flip-status" id="pp-status" aria-live="polite">Bìa hộ chiếu</p>
        <button class="icon-btn" type="button" id="pp-next" aria-label="Trang sau"><i class="ph ph-caret-right" aria-hidden="true"></i></button>
      </div>
      <p class="pp-staff-hint" id="pp-staff-hint" ${server.on && n < 4 ? '' : 'hidden'}><i class="ph ph-qr-code" aria-hidden="true"></i> Đến mỗi trạm, đưa mã QR trên trang thông tin hộ chiếu cho nhân sự quét. Dấu sẽ tự hiện ở đây.</p>
      ${n < 4 ? `<form class="code-entry pp-code" id="form-code" novalidate ${server.on ? 'hidden' : ''}>
        <label for="f-code" style="font-weight:600;font-size:15px">Mã QR mờ hoặc không quét được? Nhập mã trạm</label>
        <div class="code-row">
          <input class="input" id="f-code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="6 ký tự" aria-describedby="f-code-help">
          <button class="btn btn-primary" type="submit">Đóng dấu</button>
        </div>
        <p class="help" id="f-code-help">Bản thử nghiệm: mã các trạm là HUONG1, MAIAM2, NEPNH3, TOTLA4.</p>
      </form>` : ''}`;

    const bookEl = $('#pp-book');
    pp.pageEls = Array.from({ length: PP.count }, (_, k) => {
      const el = document.createElement('div');
      const hard = k === PP.cover || k === PP.back;
      el.className = 'pp-pg' + (hard ? ' pp-hard' : '');
      if (hard) el.dataset.density = 'hard';
      el.innerHTML = ppPageHTML(k);
      el.addEventListener('mousedown', (e) => { if (e.target.closest('button, a')) e.stopPropagation(); });
      el.addEventListener('touchstart', (e) => { if (e.target.closest('button, a')) e.stopPropagation(); }, { passive: true });
      bookEl.appendChild(el);
      return el;
    });
    bookEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ppgo]'); if (b) { ppGo(+b.dataset.ppgo); return; }
      const m = e.target.closest('[data-moment]'); if (m) { pickMoment(m.dataset.moment); return; }
      const w = e.target.closest('[data-spin]'); if (w) openWheel(+w.dataset.spin);
    });

    const PF = window.St && window.St.PageFlip;
    const start = animate ? PP.cover : Math.min(store.get('pp_page', PP.data), PP.count - 1);
    if (PF) {
      pp.flip = new PF(bookEl, {
        width: 320, height: 450, size: 'stretch', minWidth: 240, maxWidth: 360, minHeight: 340, maxHeight: 506,
        showCover: true, usePortrait: true, autoSize: true, drawShadow: true, maxShadowOpacity: 0.3,
        flippingTime: reduceMotion ? 1 : 800, mobileScrollSupport: true, disableFlipByClick: true,
        showPageCorners: !reduceMotion, swipeDistance: 30, startPage: start
      });
      pp.flip.loadFromHTML(pp.pageEls);
      pp.flip.on('flip', (e) => { sound.flip(); ppStatus(e.data); });
    } else {
      $('#pp-stage').classList.add('is-fallback');
    }
    ppQR();
    ppStatus(start);
    $('#pp-prev').addEventListener('click', () => (pp.flip ? pp.flip.flipPrev() : ppGo(Math.max(0, store.get('pp_page', 0) - 1))));
    $('#pp-next').addEventListener('click', () => (pp.flip ? pp.flip.flipNext() : ppGo(Math.min(PP.count - 1, store.get('pp_page', 0) + 1))));
    $('#pp-stage').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); $('#pp-next').click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); $('#pp-prev').click(); }
    });

    const fc = $('#form-code');
    if (fc) fc.addEventListener('submit', (e) => { e.preventDefault(); addStamp($('#f-code').value); });

    if (animate) {
      if (hasGsap && !reduceMotion) gsap.from('#pp-stage', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' });
      // Hộ chiếu mới: tự mở tới trang thông tin
      setTimeout(() => ppGo(PP.data), reduceMotion ? 0 : 900);
    }
    renderCheckout();
  }

  /* ----------------------------------------------------------------------
   * Vòng quay may mắn (nhóm đề xuất): đóng dấu xong ở trạm nào thì quay một lần ở trạm đó.
   * Phong cách Tết dân gian: màu tranh Đông Hồ (đỏ son, vàng điệp, xanh lá), tâm là đồng xu cổ,
   * hoa đào rơi khi mở vòng, trúng quà thì pháo nổ (tiếng pháo dây + tia lửa, xác pháo).
   * Ô trên vòng to nhỏ đúng theo tỉ lệ trúng (share, tổng 100). Nhóm chỉnh share theo số quà thực có.
   * Bản thử nghiệm quay trên máy người chơi; khi có máy chủ nên để máy chủ quyết định kết quả.
   * -------------------------------------------------------------------- */
  const PRIZES = {
    sticker: { label: 'Sticker Táo Quân', short: 'Sticker', icon: 'sticker', color: '#b8241c', ink: '#fff3d6' },
    keychain: { label: 'Móc khoá cá chép', short: 'Móc khoá', icon: 'key', color: '#e3a92b', ink: '#4a2408' },
    none: { label: 'Chúc may mắn lần sau', short: 'Lần sau', icon: 'clover', color: '#2f6a47', ink: '#fff3d6' }
  };
  // Thứ tự ô theo chiều kim đồng hồ, bắt đầu từ đỉnh. Hiện tại: sticker 45%, móc khoá 15%, không trúng 40%
  const WHEEL = [
    { prize: 'sticker', share: 15 }, { prize: 'none', share: 20 }, { prize: 'sticker', share: 15 },
    { prize: 'keychain', share: 15 }, { prize: 'sticker', share: 15 }, { prize: 'none', share: 20 }
  ];
  const spinOf = (id) => (pass && pass.spins && pass.spins[id]) || null;
  const segStart = (k) => WHEEL.slice(0, k).reduce((a, b) => a + b.share * 3.6, 0);
  const segAt = (deg) => { let a = 0; for (let k = 0; k < WHEEL.length; k++) { a += WHEEL[k].share * 3.6; if (deg < a) return k; } return WHEEL.length - 1; };

  // Bông hoa đào nhỏ (SVG) dùng trang trí vành vòng quay
  const blossom = (x, y, r) => {
    const p = [0, 1, 2, 3, 4].map((i) => `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.6}" transform="rotate(${i * 72})"/>`).join('');
    return `<g transform="translate(${x} ${y})" fill="#f7b3c4" stroke="#c94b6d" stroke-width=".5">${p}<circle r="${r * 0.28}" fill="#d6336c" stroke="none"/></g>`;
  };

  function wheelSVG() {
    const pt = (deg, r) => { const t = (deg - 90) * Math.PI / 180; return [+(r * Math.cos(t)).toFixed(2), +(r * Math.sin(t)).toFixed(2)]; };
    const R = 84;
    const parts = WHEEL.map((seg, k) => {
      const a0 = segStart(k), a1 = a0 + seg.share * 3.6, mid = (a0 + a1) / 2, pz = PRIZES[seg.prize];
      const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [tx, ty] = pt(mid, 55);
      return `<path d="M0 0 L${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z" fill="${pz.color}"/>
        <line x1="0" y1="0" x2="${x0}" y2="${y0}" stroke="#f3d27a" stroke-width="1.6"/>
        <text x="${tx}" y="${ty}" transform="rotate(${mid} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', 'Be Vietnam Pro', sans-serif" font-size="${pz.short.length > 7 ? 10.5 : 12.5}" fill="${pz.ink}">${pz.short}</text>`;
    }).join('');
    // Vành đèn: 24 bóng đèn vàng, trắng xen kẽ
    const bulbs = Array.from({ length: 24 }, (_, i) => { const [x, y] = pt(i * 15, 92); return `<circle cx="${x}" cy="${y}" r="2.6" fill="${i % 2 ? '#fff6d8' : '#f3c64d'}" stroke="#7a1a0e" stroke-width=".6"/>`; }).join('');
    // Hoa đào ở chỗ giao giữa các ô
    const flowers = WHEEL.map((_, k) => { const [x, y] = pt(segStart(k), R - 3); return blossom(x, y, 6); }).join('');
    return `<svg viewBox="-100 -100 200 200" role="img" aria-label="Vòng quay may mắn: ${Object.values(PRIZES).map((x) => x.label).join(', ')}" xmlns="http://www.w3.org/2000/svg">
      <circle r="99" fill="#7a1a0e"/><circle r="97" fill="none" stroke="#f3d27a" stroke-width="2"/>
      ${bulbs}
      <circle r="${R + 2}" fill="#f3d27a"/>
      ${parts}
      <circle r="${R}" fill="none" stroke="#7a1a0e" stroke-width="1.2"/>
      <circle r="30" fill="none" stroke="#f3d27a" stroke-width="1.4" stroke-dasharray="2 3"/>
      ${flowers}
      <g>
        <circle r="21" fill="#e8b84a" stroke="#8a5a0b" stroke-width="2"/>
        <circle r="17" fill="none" stroke="#8a5a0b" stroke-width=".8"/>
        <rect x="-6" y="-6" width="12" height="12" fill="#7a1a0e" stroke="#8a5a0b" stroke-width="1.2"/>
        <text y="-10.5" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', sans-serif" font-size="5.5" fill="#6b3d06">PHÚC</text>
        <text y="11" text-anchor="middle" dominant-baseline="middle" font-family="'Potta One', sans-serif" font-size="5.5" fill="#6b3d06">LỘC</text>
        <circle cx="-11.5" cy="0" r="1.6" fill="#6b3d06"/><circle cx="11.5" cy="0" r="1.6" fill="#6b3d06"/>
      </g></svg>`;
  }

  /* Hiệu ứng Tết: hoa đào rơi + pháo nổ (tia lửa vàng, xác pháo đỏ) vẽ trên một canvas phủ màn hình.
   * Canvas gắn vào <dialog> để nằm trên lớp nền mờ; không chặn thao tác (pointer-events: none). */
  const tetFx = {
    cv: null, ctx: null, parts: [], raf: 0, timer: 0, last: 0, onResize: null,
    mount(host) {
      this.unmount();
      const cv = document.createElement('canvas');
      cv.className = 'tet-fx'; cv.setAttribute('aria-hidden', 'true');
      host.appendChild(cv);
      this.cv = cv; this.ctx = cv.getContext('2d');
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);
      this.resize();
      if (reduceMotion) return;
      for (let i = 0; i < 12; i++) this.petal(true);
      this.timer = setInterval(() => this.petal(false), 420);
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    },
    resize() {
      if (!this.cv) return;
      const d = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = innerWidth * d; this.cv.height = innerHeight * d;
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
    },
    unmount() {
      clearInterval(this.timer); cancelAnimationFrame(this.raf);
      if (this.onResize) window.removeEventListener('resize', this.onResize);
      if (this.cv) this.cv.remove();
      this.cv = null; this.parts = [];
    },
    petal(anywhere, fast) {
      const whole = Math.random() < 0.3;
      this.parts.push({
        t: 'petal', whole, x: Math.random() * innerWidth, y: anywhere ? Math.random() * innerHeight * 0.8 : -20,
        vx: (Math.random() - 0.5) * 30, vy: (fast ? 90 : 35) + Math.random() * 40, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 3,
        size: whole ? 7 + Math.random() * 5 : 5 + Math.random() * 5, phase: Math.random() * 6.3,
        color: ['#f7a8bd', '#f48fb1', '#fbc4d2', '#f06292'][Math.floor(Math.random() * 4)]
      });
    },
    burst(x, y, big) {
      if (!this.cv || reduceMotion) return;
      const sparks = big ? 70 : 18, papers = big ? 46 : 10;
      for (let i = 0; i < sparks; i++) {
        const a = Math.random() * 6.3, sp = (big ? 160 : 90) + Math.random() * (big ? 260 : 140);
        this.parts.push({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.5, age: 0,
          color: ['#ffd76a', '#ffb02e', '#fff4c2', '#ff6a3d'][Math.floor(Math.random() * 4)] });
      }
      for (let i = 0; i < papers; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, sp = 80 + Math.random() * (big ? 260 : 150);
        this.parts.push({ t: 'paper', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 14,
          w: 3 + Math.random() * 3, h: 6 + Math.random() * 6, life: 1.6 + Math.random() * 0.8, age: 0, color: Math.random() < 0.8 ? '#d42a1e' : '#f3c64d' });
      }
      this.parts.push({ t: 'flash', x, y, r: big ? 70 : 26, life: big ? 0.25 : 0.12, age: 0 });
    },
    loop(now) {
      if (!this.cv) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      const c = this.ctx, H = innerHeight;
      c.clearRect(0, 0, innerWidth, H);
      this.parts = this.parts.filter((p) => {
        if (p.t === 'petal') {
          p.phase += dt * 2; p.x += (p.vx + Math.sin(p.phase) * 25) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color;
          if (p.whole) {
            for (let i = 0; i < 5; i++) { c.rotate(1.2566); c.beginPath(); c.ellipse(0, -p.size * 0.5, p.size * 0.36, p.size * 0.55, 0, 0, 6.3); c.fill(); }
            c.fillStyle = '#d6336c'; c.beginPath(); c.arc(0, 0, p.size * 0.22, 0, 6.3); c.fill();
          } else { c.beginPath(); c.ellipse(0, 0, p.size * 0.45, p.size * 0.8, 0, 0, 6.3); c.fill(); }
          c.restore();
          return p.y < H + 30;
        }
        p.age += dt;
        if (p.age > p.life) return false;
        const k = 1 - p.age / p.life;
        if (p.t === 'spark') {
          p.vx *= 0.96; p.vy = p.vy * 0.96 + 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          c.globalAlpha = k; c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, 1.2 + 1.6 * k, 0, 6.3); c.fill();
        } else if (p.t === 'paper') {
          p.vx *= 0.97; p.vy = p.vy * 0.97 + 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          c.globalAlpha = Math.min(1, k * 2); c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
        } else {
          c.globalAlpha = k * 0.85; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, '#fff8d8'); g.addColorStop(0.4, 'rgba(255,190,80,.6)'); g.addColorStop(1, 'rgba(255,120,40,0)');
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.fill();
        }
        c.globalAlpha = 1;
        return true;
      });
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }
  };

  // Pháo dây: chuỗi tiếng nổ dồn dập, mỗi tiếng một chùm tia lửa quanh hộp thoại, kết thúc bằng một tiếng đùng lớn
  function firecrackers() {
    const box = $('.dlg-box'), wheel = $('#wheel');
    const r = box ? box.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const w = wheel ? wheel.getBoundingClientRect() : r;
    let t = 0;
    for (let i = 0; i < 30; i++) {
      t += 30 + Math.random() * 70;
      setTimeout(() => {
        sound.pop(false);
        const side = Math.random() < 0.5;
        const x = side ? r.left + Math.random() * 60 - 20 : r.right - Math.random() * 60 + 20;
        tetFx.burst(Math.max(10, Math.min(innerWidth - 10, x)), r.top + 40 + Math.random() * r.height * 0.6, false);
      }, t);
    }
    setTimeout(() => { sound.pop(true); tetFx.burst(w.left + w.width / 2, w.top + w.height * 0.25, true); for (let i = 0; i < 26; i++) tetFx.petal(false, true); }, t + 220);
  }

  function openWheel(id) {
    if (!pass || !pass.stamps.includes(id) || spinOf(id)) return Promise.resolve();
    const st = STATIONS[id - 1];
    const p = ask({
      tone: 'tet',
      title: 'Vòng quay may mắn',
      html: `<p class="tet-sub">${st.name} · Mỗi trạm được quay một lần, trúng gì nhận ngay tại trạm.</p>
        <div class="wheel-wrap">
          <span class="wheel-pin" aria-hidden="true"><svg viewBox="0 0 40 52"><path d="M20 50 L6 20 A14 14 0 1 1 34 20 Z" fill="#b8241c" stroke="#f3d27a" stroke-width="2.5"/>${blossom(20, 16, 7)}</svg></span>
          <div class="wheel" id="wheel">${wheelSVG()}</div>
        </div>
        <p class="wheel-result" id="wheel-result" aria-live="polite"></p>
        <button class="btn btn-tet btn-block" type="button" id="wheel-spin"><i class="ph ph-spiral" aria-hidden="true"></i> Quay lấy lộc</button>`,
      buttons: [{ label: 'Để sau', value: 'later', cls: 'btn-quiet', id: 'wheel-close' }]
    });
    tetFx.mount(dlg);
    p.then(() => tetFx.unmount());
    $('#wheel-spin').addEventListener('click', () => spinWheel(id));
    track('wheel_open', { station: id });
    return p;
  }

  function spinWheel(id) {
    if (spinOf(id)) return;
    sound.init(); // bấm Quay là thao tác của người chơi nên trình duyệt cho phép phát tiếng
    const btn = $('#wheel-spin');
    btn.disabled = true;
    // Chọn ô theo tỉ lệ, rồi cho kim dừng ở một điểm ngẫu nhiên trong ô đó
    let r = Math.random() * 100, k = 0;
    while (k < WHEEL.length - 1 && r >= WHEEL[k].share) { r -= WHEEL[k].share; k++; }
    // Có kết quả máy chủ bốc (staff đóng dấu): kim dừng ở một ô đúng loại quà đó
    const fixed = pass.serverPrizes && pass.serverPrizes[id];
    if (fixed) { const ks = WHEEL.map((x, i) => (x.prize === fixed ? i : -1)).filter((i) => i >= 0); k = ks[Math.floor(Math.random() * ks.length)]; }
    const at = segStart(k) + WHEEL[k].share * 3.6 * (0.15 + Math.random() * 0.7);
    const prize = WHEEL[k].prize;
    // Lưu kết quả ngay khi bấm quay: đóng hộp thoại giữa chừng cũng không quay lại được
    pass.spins = Object.assign({}, pass.spins, { [id]: { prize, at: Date.now() } });
    store.set('pass', pass);
    if (!fixed) measure('spin', { st: id, prize });
    track('wheel_spin', { station: id, prize });
    const wheel = $('#wheel');
    const turn = 360 * (reduceMotion ? 1 : 6) + (360 - at);
    const reveal = () => {
      const pz = PRIZES[prize], win = prize !== 'none';
      const res = $('#wheel-result');
      if (res) {
        res.innerHTML = win
          ? `<i class="ph-fill ph-${pz.icon}" aria-hidden="true"></i> Chúc mừng! Bạn trúng <strong>${pz.label}</strong>. Đưa màn hình này cho nhân sự ở trạm để nhận quà.`
          : `<i class="ph ph-${pz.icon}" aria-hidden="true"></i> ${pz.label}. Chúc bạn năm mới an khang, cảm ơn đã ghé ${STATIONS[id - 1].name}!`;
        res.className = 'wheel-result ' + (win ? 'is-win' : 'is-miss');
      }
      if (btn) btn.hidden = true;
      const close = $('#wheel-close');
      if (close) { close.textContent = 'Xong'; close.className = 'btn btn-tet'; }
      if (win) { firecrackers(); toast(`Bạn trúng ${pz.label}!`, 'gold', 'gift'); } else sound.ting();
      ppRefresh([PP.visa(id)]);
      renderCheckout();
    };
    // Chốt kết quả đúng giờ dù trình duyệt vẽ chậm (chuyển ứng dụng, tab bị ẩn): dừng vòng ở đúng ô rồi hiện kết quả
    const dur = reduceMotion ? 0.6 : 4.6;
    let shown = false, lastSeg = -1;
    const finish = () => {
      if (shown) return;
      shown = true;
      if (hasGsap) { gsap.killTweensOf(wheel); gsap.set(wheel, { rotation: turn }); } else wheel.style.transform = `rotate(${turn}deg)`;
      reveal();
    };
    // Tiếng tích tắc mỗi khi kim lướt qua một ô
    const onUpdate = () => {
      const rot = gsap.getProperty(wheel, 'rotation');
      const seg = segAt(((360 - (rot % 360)) % 360 + 360) % 360);
      if (seg !== lastSeg) { if (lastSeg !== -1) sound.tick(); lastSeg = seg; }
    };
    if (hasGsap) gsap.fromTo(wheel, { rotation: 0 }, { rotation: turn, duration: dur, ease: reduceMotion ? 'power1.out' : 'power4.out', onUpdate, onComplete: finish });
    setTimeout(finish, dur * 1000 + 400);
  }

  // Dấu mực đóng xuống trang visa
  function playStamp(sel) {
    const wrap = $(`[data-stamp="${sel}"]`);
    const el = wrap && wrap.firstElementChild; // khung ngoài giữ góc xoay (CSS), chỉ animate SVG bên trong
    if (!el) return;
    if (!hasGsap || reduceMotion) { sound.stamp(); return; }
    gsap.fromTo(el, { scale: 2.6, opacity: 0, rotation: -22, filter: 'blur(3px)' },
      { scale: 1, opacity: 1, rotation: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power4.in',
        onComplete: () => { sound.stamp(); gsap.fromTo(wrap.closest('.pp-stamp-zone') || wrap, { x: 0 }, { x: 3, duration: 0.05, yoyo: true, repeat: 3, clearProps: 'x' }); } });
  }

  function addStamp(raw) {
    const code = String(raw || '').trim().toUpperCase();
    const input = $('#f-code');
    const st = STATIONS.find((s) => s.code === code);
    track('qr_scan', { station: st ? st.id : null, valid: !!st });
    if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Mã trạm gồm 6 ký tự, in dưới mã QR của trạm.', 'err'); input && input.classList.add('shake'); return; }
    if (!st) { toast('Mã này chưa khớp với trạm nào. Bạn kiểm tra lại hoặc nhờ nhân sự quét giúp nhé.', 'err'); input && input.classList.add('shake'); return; }
    if (pass.stamps.includes(st.id)) { toast(`${st.name} đã đóng dấu cho bạn rồi.`, 'info', 'seal-check'); ppGo(PP.visa(st.id)); return; }
    if (input) input.value = '';
    doStamp(st.id);
  }

  // Đóng dấu trạm id: từ mã trạm tự nhập (bản demo) hoặc từ máy chủ khi staff quét QR (fromServer)
  function doStamp(id, ts, fromServer) {
    const st = STATIONS[id - 1];
    if (pass.stamps.includes(id)) return;
    pass.stamps.push(id);
    pass.stampedAt = Object.assign({}, pass.stampedAt, { [id]: ts || Date.now() });
    store.set('pass', pass);
    track('stamp_added', { station: id, by: fromServer ? 'staff' : 'self' });
    if (!fromServer) measure('stamp', { st: id });
    const complete = pass.stamps.length === 4;
    const hint = $('#pp-staff-hint'); if (hint && complete) hint.hidden = true;

    // Cập nhật nội dung các trang, lật tới trang visa rồi mới đóng dấu
    ppRefresh([PP.data, PP.guide, PP.visa(st.id), PP.done]);
    const target = PP.visa(st.id);
    const cur = store.get('pp_page', 0);
    const visible = pp.flip ? (pp.flip.getOrientation() === 'landscape' ? [cur, cur % 2 ? cur + 1 : cur - 1] : [cur]) : [target];
    const wait = visible.includes(target) || reduceMotion ? 80 : 950;
    // Đóng dấu liên tiếp nhanh: huỷ các lần lật / đóng dấu còn chờ của lần trước
    pp.timers.forEach(clearTimeout); pp.timers = [];
    const later = (fn, ms) => pp.timers.push(setTimeout(fn, ms));
    ppGo(target);
    later(() => {
      playStamp(st.id);
      // Dấu đóng xong thì mở vòng quay; quay xong (hoặc để sau) mới sang trang hoàn thành
      later(() => openWheel(st.id).then(() => {
        if (complete) { ppGo(PP.done); setTimeout(() => playStamp('gold'), reduceMotion ? 80 : 950); }
      }), reduceMotion ? 300 : 1100);
    }, wait);

    if (complete) {
      track('passport_complete');
      toast('Đủ bốn dấu rồi. Mời bạn đến bàn check-out nhận quà.', 'gold', 'gift');
      const fc = $('#form-code'); if (fc) fc.remove();
      renderCheckout();
    } else {
      toast(`Đã đóng dấu ${st.name}. Còn ${4 - pass.stamps.length} trạm nữa.`, 'ok', 'seal-check');
    }
  }

  // Danh sách quà vòng quay đã trúng ở các trạm
  function wonList() {
    const won = STATIONS.map((s) => [s, spinOf(s.id)]).filter(([, x]) => x && x.prize !== 'none');
    if (!won.length) return '';
    return `<div class="won"><strong><i class="ph ph-gift" aria-hidden="true"></i> Quà vòng quay</strong>
      <ul>${won.map(([s, x]) => `<li><span>${PRIZES[x.prize].label}</span><small>${s.name}</small></li>`).join('')}</ul></div>`;
  }

  function renderCheckout() {
    const box = $('#checkout');
    if (typeof renderLetter === 'function' && $('#letter-lock')) renderLetter();
    if (!pass || pass.stamps.length < 4) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `
      <div><h3>Chúc mừng, bạn đã đi đủ bốn trạm</h3>
      <p style="color:var(--text-muted);margin-top:6px">${pass.claimed ? 'Quà đã được trao. Cảm ơn bạn đã đồng hành.' : 'Đưa mã này cho nhân sự tại bàn check-out. Mã chỉ dùng được một lần.'}</p></div>
      <p class="gift-code ${pass.claimed ? 'is-claimed' : ''}" aria-label="Mã nhận quà ${pass.giftCode.split('').join(' ')}">${pass.giftCode}</p>
      ${pass.claimed ? '' : server.on
        ? '<p class="help"><i class="ph ph-qr-code" aria-hidden="true"></i> Nhân sự quét QR hộ chiếu của bạn ở bàn check-out để xác nhận trao quà.</p>'
        : '<button class="btn btn-ghost" type="button" id="btn-claim"><i class="ph ph-hand-heart" aria-hidden="true"></i> Nhân sự xác nhận đã trao quà</button>'}
      ${wonList()}
      <div class="optin">
        <strong>Viết lá sớ gửi Táo</strong>
        <p style="color:var(--text-muted);font-size:15px">Lá sớ đã mở. Ghi bốn lời gửi ông Táo và dán ảnh khoảnh khắc ở các trạm.</p>
        <div class="optin-actions">
          <a class="btn btn-primary btn-sm" href="#la-so" id="optin-yes">Viết lá sớ</a>
          <button class="btn btn-quiet" type="button" id="optin-no">Để sau</button>
        </div>
      </div>`;
    const cb = $('#btn-claim');
    if (cb) cb.addEventListener('click', () => {
      if (pass.claimed) { toast('Mã quà này đã được dùng. Nếu có nhầm lẫn, bạn báo nhân sự giúp nhé.', 'info'); return; }
      pass.claimed = true; store.set('pass', pass);
      track('reward_claimed');
      measure('claim');
      toast('Đã ghi nhận trao quà. Chúc bạn một năm mới thật ấm.', 'gold', 'gift');
      renderCheckout();
    });
    $('#optin-yes').addEventListener('click', () => track('optin_yes'));
    $('#optin-no').addEventListener('click', () => { track('optin_no'); toast('Không sao. Lá sớ luôn chờ bạn ở cuối trang.', 'info'); });
    if (hasGsap && !reduceMotion) gsap.from(box, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });
  }

  // Xoá dữ liệu (góp ý 4c): nói rõ sẽ mất gì, phải gõ XOÁ mới bật được nút xoá
  $('#btn-clear-local').addEventListener('click', async () => {
    const lose = [];
    if (pass) lose.push(`Thẻ thông hành <strong>${esc(pass.id)}</strong> mang tên ${esc(pass.nickname)}`);
    if (pass && pass.stamps.length) lose.push(`${pass.stamps.length}/4 dấu trạm đã đóng`);
    if (pass && pass.stamps.length === 4 && !pass.claimed) lose.push(`Mã nhận quà <strong>${esc(pass.giftCode)}</strong> (chưa nhận quà)`);
    if (book.done.size) lose.push(`${book.done.size}/4 huy hiệu trong sách`);
    const nPhoto = momentCount();
    if (nPhoto) lose.push(`${nPhoto} ảnh khoảnh khắc ở sự kiện`);
    lose.push('Tiến độ đọc sách và lá sớ đang soạn');
    const p = ask({
      tone: 'danger',
      title: 'Xoá dữ liệu trên máy này?',
      html: `<p>Những thứ sau sẽ mất và <strong>không khôi phục được</strong> trên máy này:</p>
        <ul class="dlg-list">${lose.map((x) => `<li>${x}</li>`).join('')}</ul>
        ${pass ? `<p class="dlg-note"><i class="ph ph-camera" aria-hidden="true"></i><span>Nên chụp lại mã thẻ <strong>${esc(pass.id)}</strong> trước, để nhân sự có thể hỗ trợ lấy lại.</span></p>` : ''}
        <label class="dlg-label" for="dlg-type">Gõ <strong>XOÁ</strong> để xác nhận</label>
        <input class="input" id="dlg-type" autocomplete="off" spellcheck="false" placeholder="XOÁ">`,
      buttons: [{ label: 'Giữ lại dữ liệu', value: 'cancel', cls: 'btn-primary' }, { label: 'Xoá vĩnh viễn', value: 'ok', cls: 'btn-danger', id: 'dlg-ok', disabled: true }]
    });
    const input = $('#dlg-type');
    input.addEventListener('input', () => { $('#dlg-ok').disabled = plain(input.value) !== 'XOA'; });
    input.focus();
    const v = await p;
    track('clear_data', { confirmed: v === 'ok' });
    if (v !== 'ok') return;
    store.clear();
    pass = null; book.done.clear(); book.idx = 0; book.started.clear();
    renderTicket(); renderRegister(); renderAllChapters(); goPage(P.cover); moveIndicator(false); renderLetter();
    toast('Đã xoá dữ liệu trên máy này.', 'ok');
  });

  /* ======================================================================
   * S07–S08 · LÁ SỚ GỬI TÁO (UGC "Year in Values")
   * Góp ý của cô: không gán người dùng vào MỘT giá trị như tính cách ("bạn là Táo X"),
   * vì sẽ khiến họ bỏ qua ba giá trị còn lại. Lá sớ luôn ghi đủ BỐN giá trị,
   * mỗi giá trị một lời gửi (gợi ý sẵn, sửa tự do, không có đúng sai).
   * Chỉ cần đủ 4 dấu trạm là mở; đọc sách không bắt buộc (nhóm chốt lại).
   * ==================================================================== */
  const VALUES = [
    { name: 'Hướng Thiện', icon: 'fire', lines: ['Năm nay nhà mình dám nhận lỗi và sửa sai.', 'Mỗi người tự nhìn lại mình để sống tử tế hơn.', 'Gieo thêm một việc tốt cho người quanh mình.'] },
    { name: 'Mái Ấm', icon: 'bowl-food', lines: ['Bữa cơm nào cũng có người chờ nhau về.', 'Nói với nhau nhẹ nhàng hơn một chút.', 'Nhường nhau một bước để nhà luôn ấm.'] },
    { name: 'Nếp Nhà', icon: 'flower-lotus', lines: ['Giữ nén hương ông bà vẫn thắp mỗi chiều cuối năm.', 'Kể cho em nhỏ nghe chuyện ngày xưa của nhà mình.', 'Cùng nhau chuẩn bị mâm cúng ông Táo.'] },
    { name: 'Tốt Lành', icon: 'fish', lines: ['Mang ước mong cả nhà khỏe mạnh sang năm mới.', 'Dám bắt đầu lại một điều còn dang dở.', 'Như cá chép, gặp khó vẫn bơi tiếp.'] }
  ];
  const letter = Object.assign({ picks: [0, 0, 0, 0], custom: ['', '', '', ''] }, store.get('letter', {}));
  const ugc = { ratio: '1:1', caption: 0 };
  const lineOf = (k) => (letter.custom[k] || '').trim() || VALUES[k].lines[letter.picks[k] % VALUES[k].lines.length];
  const saveLetter = () => store.set('letter', letter);

  // ---------- Ảnh khoảnh khắc: slot '1'..'4' cho 4 trạm, 'x1','x2' cho ảnh khác
  const MOMENT_SLOTS = ['1', '2', '3', '4', 'x1', 'x2'];
  let moments = store.get('moments', {});
  const momentCount = () => MOMENT_SLOTS.filter((k) => moments[k]).length;
  function saveMoments() {
    try { localStorage.setItem('cnt_moments', JSON.stringify(moments)); return true; } catch (e) { return false; }
  }
  const momentInput = $('#moment-input');
  function pickMoment(slot) { momentInput.dataset.slot = slot; momentInput.value = ''; momentInput.click(); }
  momentInput.addEventListener('change', () => {
    const file = momentInput.files && momentInput.files[0], slot = momentInput.dataset.slot;
    if (!file || !slot) return;
    if (!/^image\//.test(file.type)) { toast('Tệp này không phải ảnh. Bạn chọn ảnh JPG hoặc PNG nhé.', 'err'); return; }
    if (file.size > 20 * 1024 * 1024) { toast('Ảnh lớn hơn 20MB. Bạn chọn ảnh nhỏ hơn giúp nhé.', 'err'); return; }
    const img = new Image();
    img.onload = () => {
      // Nén về tối đa 900px, xử lý hoàn toàn trên máy, không gửi đi đâu
      const sc = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      const prev = moments[slot];
      moments[slot] = c.toDataURL('image/jpeg', 0.78);
      if (!saveMoments()) {
        if (prev) moments[slot] = prev; else delete moments[slot];
        toast('Bộ nhớ trình duyệt đã đầy. Xoá bớt một ảnh rồi thử lại nhé.', 'err');
        return;
      }
      track('moment_upload', { slot, station: /^\d$/.test(slot) ? +slot : null });
      toast(/^\d$/.test(slot) ? `Đã lưu khoảnh khắc ở ${STATIONS[+slot - 1].name}.` : 'Đã lưu ảnh khoảnh khắc.', 'ok', 'camera');
      if (/^\d$/.test(slot) && pass) ppRefresh([PP.visa(+slot)]);
      renderMoments(); drawCard();
    };
    img.onerror = () => toast('Chưa đọc được ảnh này. Thử ảnh khác nhé.', 'err');
    img.src = URL.createObjectURL(file);
  });
  function removeMoment(slot) {
    delete moments[slot]; saveMoments();
    if (/^\d$/.test(slot) && pass) ppRefresh([PP.visa(+slot)]);
    renderMoments(); drawCard();
  }

  // ---------- Điều kiện mở lá sớ
  const gate = () => {
    const ch = book.done.size, st = pass ? pass.stamps.length : 0;
    return { ch, st, ok: st === 4 };
  };

  let letterShown = false; // lần dựng đầu (lúc tải trang) không chạy hiệu ứng mở khoá
  function renderLetter() {
    const g = gate(), wasOpen = !$('#letter-open').hidden, first = !letterShown;
    letterShown = true;
    $('#letter-lock').hidden = g.ok;
    $('#letter-open').hidden = !g.ok;
    if (!g.ok) { renderLock(g); return; }
    renderLetterEdit(); renderMoments(); drawCard();
    if (!wasOpen) {
      if (!store.get('letter_unlocked', false)) { store.set('letter_unlocked', true); track('letter_unlocked'); }
      if (!first && hasGsap && !reduceMotion) gsap.from('#letter-open > *', { y: 24, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' });
    }
  }

  function renderLock(g) {
    const step = (done, title, sub, href, cta) => `
      <li class="${done ? 'is-done' : ''}">
        <i class="ph${done ? '-fill' : ''} ph-${done ? 'check-circle' : 'circle-dashed'}" aria-hidden="true"></i>
        <span><strong>${title}</strong><small>${sub}</small></span>
        ${done ? '' : `<a class="btn btn-ghost btn-sm" href="${href}">${cta}</a>`}
      </li>`;
    $('#letter-lock').innerHTML = `
      <div class="lock-head">
        <span class="lock-ico" aria-hidden="true"><i class="ph ph-lock-simple"></i></span>
        <div><h3>Lá sớ mở khi bạn đi trọn hành trình</h3>
        <p>Lá sớ ghi đủ bốn giá trị, nên cần bạn đi qua cả bốn trạm ở sự kiện. Sách bốn chương là phần đọc thêm, không bắt buộc.</p></div>
      </div>
      <ol class="lock-steps">
        ${step(g.st === 4, 'Đóng đủ 4 dấu ở 4 trạm sự kiện', pass ? `${g.st}/4 dấu` : 'Chưa có thẻ thông hành', '#tram-trai-nghiem', pass ? 'Xem hộ chiếu' : 'Tạo thẻ thông hành')}
        ${step(g.ch === 4, 'Nghe 4 câu chuyện trong sách (không bắt buộc)', `${g.ch}/4 chương`, '#doc-sach', 'Đọc sách')}
      </ol>
      <ul class="lock-values" aria-label="Tiến độ từng giá trị">
        ${VALUES.map((v, k) => {
          const read = book.done.has(k), stamped = !!(pass && pass.stamps.includes(k + 1));
          return `<li class="${stamped ? 'is-done' : ''}"><i class="ph${stamped ? '-fill' : ''} ph-${v.icon}" aria-hidden="true"></i><span>${v.name}</span>
            <small><i class="ph${read ? '-fill' : ''} ph-book-open" aria-label="${read ? 'Đã nghe chuyện' : 'Chưa nghe chuyện'}"></i><i class="ph${stamped ? '-fill' : ''} ph-seal-check" aria-label="${stamped ? 'Đã đóng dấu' : 'Chưa đóng dấu'}"></i></small></li>`;
        }).join('')}
      </ul>`;
  }

  function renderLetterEdit() {
    $('#letter-edit').innerHTML = `
      <h3>Bốn lời gửi ông Táo</h3>
      <p class="help">Mỗi giá trị một câu. Giữ gợi ý sẵn hoặc viết bằng lời của nhà bạn.</p>
      <div class="letter-rows">${VALUES.map((v, k) => `
        <div class="letter-row">
          <label for="letter-${k}"><i class="ph-fill ph-${v.icon}" aria-hidden="true"></i>${v.name}</label>
          <textarea class="input" id="letter-${k}" rows="2" maxlength="80" data-k="${k}">${esc(lineOf(k))}</textarea>
          <button class="linklike" type="button" data-suggest="${k}"><i class="ph ph-shuffle" aria-hidden="true"></i> Gợi ý khác</button>
        </div>`).join('')}
      </div>`;
    let raf = 0;
    $$('#letter-edit textarea').forEach((t) => t.addEventListener('input', () => {
      letter.custom[+t.dataset.k] = t.value;
      saveLetter();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(drawCard);
    }));
    $$('#letter-edit [data-suggest]').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.suggest;
      letter.picks[k] = (letter.picks[k] + 1) % VALUES[k].lines.length;
      letter.custom[k] = '';
      saveLetter();
      $('#letter-' + k).value = lineOf(k);
      drawCard();
    }));
  }

  function renderMoments() {
    const box = $('#moments');
    if (!box) return;
    box.innerHTML = MOMENT_SLOTS.map((slot) => {
      const st = /^\d$/.test(slot) ? STATIONS[+slot - 1] : null;
      const label = st ? st.name.replace('Trạm ', '') : 'Ảnh khác';
      const src = moments[slot];
      return `<div class="moment ${src ? 'has-photo' : ''}">
        ${src
          ? `<img src="${src}" alt="Khoảnh khắc ${label}"><button class="moment-del" type="button" data-del="${slot}" aria-label="Xoá ảnh ${label}"><i class="ph ph-x" aria-hidden="true"></i></button>`
          : `<button class="moment-add" type="button" data-add="${slot}" aria-label="Thêm ảnh ${label}"><i class="ph ph-camera-plus" aria-hidden="true"></i></button>`}
        <span class="moment-label">${label}</span>
      </div>`;
    }).join('');
    $$('[data-add]', box).forEach((b) => b.addEventListener('click', () => pickMoment(b.dataset.add)));
    $$('[data-del]', box).forEach((b) => b.addEventListener('click', () => removeMoment(b.dataset.del)));
  }

  // ---------- Vẽ lá sớ (canvas) theo phong cách sách cổ: giấy dó, mực son, chữ có chân
  const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let drawing = 0;
  async function drawCard() {
    const ticket = ++drawing;
    const cv = $('#ugc-canvas');
    if (!cv || $('#letter-open').hidden) return;
    const W = 1080, H = ugc.ratio === '9:16' ? 1920 : 1080, tall = H > W;
    try {
      await Promise.all([document.fonts.load('700 60px "Playfair Display"'), document.fonts.load('italic 400 40px "EB Garamond"'), document.fonts.load('600 30px "Be Vietnam Pro"')]);
    } catch (e) { /* dùng font dự phòng */ }
    const photos = (await Promise.all(MOMENT_SLOTS.filter((k) => moments[k]).slice(0, 4).map((k) => loadImg(moments[k])))).filter(Boolean);
    const paper = await loadImg('images/giay-cu.jpg');
    if (ticket !== drawing) return; // đã có lần vẽ mới hơn
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const serif = (w, sz, it) => `${it ? 'italic ' : ''}${w} ${sz}px "EB Garamond", Georgia, serif`;
    const disp = (w, sz) => `${w} ${sz}px "Playfair Display", Georgia, serif`;
    const sans = (w, sz) => `${w} ${sz}px "Be Vietnam Pro", system-ui, sans-serif`;
    const RED = '#9b2a17', INK = '#3a2614';

    // Giấy cũ + viền son kép
    if (paper) ctx.drawImage(paper, 0, 0, W, H); else { ctx.fillStyle = '#efdfbd'; ctx.fillRect(0, 0, W, H); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
    vg.addColorStop(0, 'rgba(120,70,25,0)'); vg.addColorStop(1, 'rgba(120,70,25,.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = RED; ctx.lineWidth = 6; ctx.strokeRect(44, 44, W - 88, H - 88);
    ctx.lineWidth = 2; ctx.strokeRect(60, 60, W - 120, H - 120);

    ctx.textAlign = 'center'; ctx.fillStyle = RED;
    let y = tall ? 210 : 128;
    ctx.font = sans(700, 26); ctx.fillText('CHUYỆN NHÀ TÁO  ·  ĐÊM 23 THÁNG CHẠP', W / 2, y);
    y += tall ? 100 : 74;
    ctx.fillStyle = '#3b1f0e'; ctx.font = disp(800, tall ? 92 : 70); ctx.fillText('Lá sớ gửi Táo', W / 2, y);
    y += tall ? 66 : 48;
    ctx.fillStyle = INK; ctx.font = serif(400, tall ? 40 : 34, true);
    ctx.fillText(`Nhà của ${(pass && pass.nickname) || 'người giữ lửa'} kính gửi`, W / 2, y);

    // Bốn giá trị, mỗi giá trị một lời
    const rowH = tall ? 170 : 116, left = 130, textX = 250;
    y += tall ? 64 : 34;
    VALUES.forEach((v, k) => {
      const cy = y + rowH / 2;
      ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(left + 30, cy, tall ? 42 : 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbe9c4'; ctx.font = disp(700, tall ? 40 : 32); ctx.textBaseline = 'middle';
      ctx.fillText(['I', 'II', 'III', 'IV'][k], left + 30, cy + 2); ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = RED; ctx.font = sans(700, tall ? 30 : 25); ctx.fillText(v.name.toUpperCase(), textX, cy - (tall ? 22 : 16));
      ctx.fillStyle = INK; ctx.font = serif(400, tall ? 40 : 33, true);
      wrap(ctx, lineOf(k), textX, cy + (tall ? 30 : 22), W - textX - 120, tall ? 46 : 38, 2);
      ctx.textAlign = 'center';
      if (k < 3) { ctx.strokeStyle = 'rgba(110,62,25,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(textX, y + rowH); ctx.lineTo(W - 120, y + rowH); ctx.stroke(); }
      y += rowH;
    });

    // Khoảnh khắc: ảnh dán kiểu polaroid
    if (photos.length) {
      const n = photos.length, size = tall ? 240 : 124, gap = tall ? 34 : 30;
      const cols = tall ? Math.min(n, 2) : n, rows = Math.ceil(n / cols);
      const totalW = cols * size + (cols - 1) * gap;
      const py = y + (tall ? 56 : 26);
      photos.forEach((im, k) => {
        const c = k % cols, r = Math.floor(k / cols);
        const x = W / 2 - totalW / 2 + c * (size + gap), yy = py + r * (size + gap + 30);
        ctx.save();
        ctx.translate(x + size / 2, yy + size / 2); ctx.rotate(((k % 2 ? 1 : -1) * (2 + k)) * Math.PI / 180);
        ctx.shadowColor = 'rgba(60,30,10,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#fbf6ea'; ctx.fillRect(-size / 2 - 10, -size / 2 - 10, size + 20, size + 40);
        ctx.shadowColor = 'transparent';
        const sc = Math.max(size / im.width, size / im.height);
        ctx.beginPath(); ctx.rect(-size / 2, -size / 2, size, size); ctx.clip();
        ctx.drawImage(im, -im.width * sc / 2, -im.height * sc / 2, im.width * sc, im.height * sc);
        ctx.restore();
      });
      y = py + rows * (size + gap + 30);
    }

    ctx.fillStyle = RED; ctx.font = sans(700, 26);
    ctx.fillText('#ChuyenNhaTao  #YearInValues', W / 2, H - (tall ? 96 : 76));
    renderCaptions();
  }
  function wrap(ctx, text, x, y, maxW, lh, maxLines = 99) {
    const words = text.split(' '); let line = '', n = 0;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        if (++n >= maxLines) { ctx.fillText(line + '…', x, y); return; }
        ctx.fillText(line, x, y); line = w; y += lh;
      } else line = t;
    }
    ctx.fillText(line, x, y);
  }

  function captionsFor() {
    const name = (pass && pass.nickname) || 'nhà mình';
    return [
      `Lá sớ năm nay của nhà ${name}: hướng thiện, mái ấm, nếp nhà, tốt lành. Nhờ ông Táo mang lên trời giúp nhé! #ChuyenNhaTao #YearInValues`,
      `Bếp đỏ giữ lửa, nếp nhà đoàn viên. Một năm của nhà mình gói trong bốn giá trị. Còn lá sớ nhà bạn viết gì? #ChuyenNhaTao #YearInValues`,
      `Đi đủ bốn trạm ở sự kiện Chuyện Nhà Táo, và đây là lá sớ nhà mình gửi ông Táo. #ChuyenNhaTao #YearInValues`
    ];
  }
  function renderCaptions() {
    $('#captions').innerHTML = captionsFor().map((c, i) => `<button class="caption" type="button" data-c="${i}"><i class="ph ph-copy" aria-hidden="true"></i><span>${esc(c)}</span></button>`).join('');
    $$('#captions .caption').forEach((b) => b.addEventListener('click', () => copyCaption(+b.dataset.c)));
  }
  async function copyCaption(i) {
    const text = captionsFor()[i];
    ugc.caption = i;
    try { await navigator.clipboard.writeText(text); toast('Đã sao chép caption. Dán vào bài đăng là xong.', 'ok', 'copy'); }
    catch (e) { toast('Chưa sao chép được tự động. Bạn giữ và chọn đoạn caption để sao chép nhé.', 'info'); }
    track('copy_caption', { version: i + 1 });
  }

  $$('#ratio-seg button').forEach((b) => b.addEventListener('click', () => {
    ugc.ratio = b.dataset.ratio;
    $$('#ratio-seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    drawCard();
  }));

  function cardBlob() { return new Promise((res) => $('#ugc-canvas').toBlob(res, 'image/png')); }
  $('#btn-download').addEventListener('click', async () => {
    const blob = await cardBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ChuyenNhaTao-la-so-${ugc.ratio.replace(':', 'x')}.png`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    track('download', { ratio: ugc.ratio, photos: momentCount() });
  });
  async function share(network) {
    track('share_click', { network });
    const text = captionsFor()[ugc.caption];
    const blob = await cardBlob();
    const file = new File([blob], 'la-so-gui-tao.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); } catch (e) { /* bỏ qua */ }
    if (network === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(location.origin + location.pathname), '_blank', 'noopener,width=640,height=560');
      toast('Caption đã được sao chép. Tải lá sớ về để đính kèm ảnh vào bài đăng.', 'info', 'facebook-logo');
    } else {
      toast('Caption đã được sao chép. Tải lá sớ về, mở TikTok và đăng ảnh kèm caption nhé.', 'info', 'tiktok-logo');
    }
  }
  $('#btn-share-fb').addEventListener('click', () => share('facebook'));
  $('#btn-share-tt').addEventListener('click', () => share('tiktok'));

  /* ======================================================================
   * Khởi tạo nội dung
   * ==================================================================== */
  function renderAllChapters() {
    CHAPTERS.forEach((c, i) => {
      renderListen(i, book.done.has(i));
      renderBadgePage(i);
    });
    renderBadges();
    syncTabs();
  }
  renderAllChapters();
  initFlipbook();
  renderTicket();
  renderRegister();
  renderLetter();
  if (pass) startPolling();

  // QR ở cổng: ?vao=CONG23 → ghi nhận check-in. QR ở trạm: ?tram=HUONG1 → đóng dấu.
  // Xử lý xong thì xoá tham số khỏi thanh địa chỉ để tải lại trang không đóng dấu lần nữa.
  {
    const qs = new URLSearchParams(location.search);
    const gate = qs.get('vao'), tram = qs.get('tram');
    if (gate || tram) {
      qs.delete('vao'); qs.delete('tram');
      history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
    }
    if (gate) enterGate(gate);
    if (tram && server.on) {
      toast('Ở sự kiện, nhân sự sẽ quét mã QR trên hộ chiếu của bạn để đóng dấu.', 'info', 'qr-code');
    } else if (tram) {
      if (pass) {
        setTimeout(() => {
          $('#ticket-slot').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          setTimeout(() => addStamp(tram), 700);
        }, 400);
      } else {
        store.set('pending_stamp', String(tram).toUpperCase());
        toast('Bạn chưa có thẻ thông hành. Nhập tên để tạo thẻ, dấu của trạm này sẽ được đóng ngay sau đó.', 'info', 'qr-code');
        setTimeout(() => $('#register').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }), 400);
      }
    }
  }
  requestAnimationFrame(() => moveIndicator(false));

  document.addEventListener('copy', () => {}, { passive: true });
  window.addEventListener('pagehide', () => { stopVoice(); stopTale(); });

  /* ======================================================================
   * HERO fallback (không có WebGL)
   * ==================================================================== */
  if (!window.carpScene) $('#hero').classList.add('no-webgl');

  /* ======================================================================
   * GSAP + ScrollTrigger — mỗi chuyển động đều có lý do:
   *  - hero: chữ hiện theo nhịp đọc; cuộn thì camera bay lên theo đàn đèn (dẫn chuyện)
   *  - section: hiện dần khi vào khung nhìn (thứ bậc)
   *  - flow: đường nối các bước tự vẽ (trình tự)
   * ==================================================================== */
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  // Header đặc lại khi rời hero; menu điều hướng sáng theo section đang xem
  ScrollTrigger.create({
    start: 40, end: 'max',
    onToggle: (self) => $('#site-header').classList.toggle('is-solid', self.isActive || menu.classList.contains('is-open'))
  });
  ['doc-sach', 'tram-trai-nghiem', 'la-so'].forEach((id) => {
    ScrollTrigger.create({
      trigger: '#' + id, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => $$(`.nav-links a[href="#${id}"]`).forEach((a) => a.classList.toggle('is-active', self.isActive))
    });
  });

  if (!reduceMotion) {
    // Hero intro
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('#hero-title .word', { yPercent: 110, duration: 0.9, stagger: 0.06 }, 0.15)
      .from('[data-hero-fade]', { y: 18, opacity: 0, duration: 0.7, stagger: 0.12 }, 0.35);

    // Cuộn khỏi hero: chữ trôi lên, camera bay lên theo đàn đèn trời
    gsap.to('.hero-content', {
      y: -80, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 35%', scrub: true }
    });
    ScrollTrigger.create({
      trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (self) => window.carpScene && window.carpScene.setScroll(self.progress)
    });

    // Hiện dần theo nhóm (UI/UX Pro Max: stagger 300–450ms)
    gsap.set('.reveal', { opacity: 0, y: 28 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true })
    });

    gsap.from('.flow-line', { scaleX: 0, duration: 0.9, stagger: 0.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.flow', start: 'top 85%' } });
    gsap.from('.flow .ico', { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.15, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.flow', start: 'top 85%' } });

  }

  else {
    // Giảm chuyển động: chỉ mờ dần (không dịch chuyển, không parallax, không bay camera)
    gsap.from('[data-hero-fade], #hero-title', { opacity: 0, duration: 0.8, stagger: 0.1, ease: 'none' });
    gsap.set('.reveal', { opacity: 0 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'none', overwrite: true })
    });
  }

  // Font tải xong làm đổi chiều cao chữ → tính lại vị trí trigger
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ScrollTrigger.refresh(); moveIndicator(false); });
})();
