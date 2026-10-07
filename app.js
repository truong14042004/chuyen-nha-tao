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
  window.addEventListener('online', () => { syncOnline(); toast('Đã có mạng lại. Thẻ của bạn đã được đồng bộ.', 'ok', 'wifi-high'); });
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
      game: {
        type: 'quiz', label: 'Câu hỏi nhanh',
        q: 'Trước khi ông Táo về trời, việc tự soi xét có ý nghĩa gì?',
        options: [
          { t: 'Nhìn thật lòng mình để năm sau sống tốt hơn', ok: true },
          { t: 'Giấu đi những lỗi của năm cũ' },
          { t: 'Chỉ cần sắm mâm cúng thật to' }
        ]
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
      game: {
        type: 'order', label: 'Ghép câu ca dao',
        q: 'Chạm lần lượt các mảnh để ghép thành câu ca dao về hòa thuận.',
        pieces: ['Thuận vợ', 'thuận chồng', 'tát biển Đông', 'cũng cạn']
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
      game: {
        type: 'match', label: 'Ghép vật dụng với ý nghĩa',
        q: 'Chọn một vật dụng, rồi chọn ý nghĩa đúng của nó.',
        pairs: [
          ['Kiềng ba chân', 'Ba vị Táo giữ lửa bếp'],
          ['Cá chép', 'Đưa ông Táo về trời'],
          ['Nén hương', 'Lòng thành với tổ tiên'],
          ['Mũ áo giấy', 'Lễ phục dâng ông Táo']
        ]
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
      game: {
        type: 'wish', label: 'Gửi lời nguyện',
        q: 'Chọn một điều tốt lành, viết thêm vài chữ nếu muốn, rồi thả đèn trời.',
        wishes: ['Cả nhà khỏe mạnh, đủ mặt mỗi bữa cơm', 'Một năm học tập, làm việc hanh thông', 'Sống tử tế hơn với người xung quanh']
      }
    }
  ];

  // ----------------------------------------------------------------------
  // Quyển sách lật trang (StPageFlip). Bố cục 22 trang:
  //   0 bìa trước · 1 lời mở đầu · 2 mục lục
  //   mỗi chương i: 3+4i tranh · 4+4i nội dung · 5+4i mini-game · 6+4i huy hiệu
  //   19 tổng kết huy hiệu · 20 sự kiện · 21 bìa sau
  // Trang đôi (desktop): [1,2] [3,4] [5,6] ... [19,20] → tranh|nội dung, game|huy hiệu.
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
    fails: [0, 0, 0, 0],
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
    </div>`;
  pageHTML[P.intro] = `
    <div class="pg-body">
      <p class="pg-kicker">Lời mở đầu</p>
      <h3 class="pg-title">Gửi người giữ lửa</h3>
      <p class="pg-prose">Ngày 23 tháng Chạp, ông Táo cưỡi cá chép về trời, kể lại một năm của mỗi gia đình. Cuốn sách nhỏ này mời bạn ngồi bên bếp lửa, đọc bốn câu chuyện về hướng thiện, mái ấm, nếp nhà và điều tốt lành.</p>
      <p class="pg-prose">Cuối mỗi chương có một thử thách nhỏ. Hoàn thành để nhận huy hiệu, rồi mang bốn huy hiệu đến sự kiện nhé.</p>
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
          <button class="btn btn-quiet btn-sm" type="button" data-goto="${P.game(i)}">Làm thử thách <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
        </div>
      </div>${folio(P.text(i))}`;
    pageHTML[P.game(i)] = `<div class="pg-body"><p class="pg-kicker">Thử thách chương ${i + 1}</p><div class="game" id="game-${i}"></div></div>${folio(P.game(i))}`;
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
    book.page = p;
    store.set('page', p);
    stopVoice();
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
    if (v) voiceOver(v, +v.dataset.voice);
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
    // Trang tỉ lệ 460:620 (điện thoại: 460:740 cho đủ chỗ mini-game),
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
    if ('speechSynthesis' in window) speechSynthesis.cancel();
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
    const c = CHAPTERS[i];
    voiceBtn = btn; speaking = true; setVoiceLabel(btn, true);
    track('voice_play', { chapter: i + 1 });
    audioEl = new Audio(`audio/chuong-${i + 1}.mp3`);
    audioEl.onended = () => { speaking = false; audioEl = null; setVoiceLabel(btn, false); };
    audioEl.onerror = () => { audioEl = null; if (speaking) speakTTS(c, btn); };
    audioEl.play().catch(() => { /* lỗi tải file sẽ đi vào onerror */ });
  }

  // ------------------------------------------------------------ mini-game
  function gameShell(i, body) {
    const c = CHAPTERS[i];
    return `<div class="game-head"><h4><i class="ph ph-puzzle-piece" aria-hidden="true"></i>${c.game.label}</h4><button class="btn btn-quiet" type="button" id="skip-${i}" hidden>Bỏ qua</button></div>
      <p class="game-prompt">${c.game.q}</p>${body}<p class="feedback" id="fb-${i}" role="status"></p>`;
  }
  function fail(i, msg, el) {
    book.fails[i]++;
    const fb = $('#fb-' + i); fb.className = 'feedback err'; fb.textContent = msg;
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    // PDF S02: có nút bỏ qua mini-game sau lần sai thứ 3
    if (book.fails[i] >= 3) $('#skip-' + i).hidden = false;
  }

  function renderGame(i) {
    const c = CHAPTERS[i], g = c.game, box = $('#game-' + i);
    book.fails[i] = 0;
    if (g.type === 'quiz') {
      const opts = g.options.map((o, k) => ({ ...o, k })).sort(() => Math.random() - 0.5);
      box.innerHTML = gameShell(i, `<div class="options">${opts.map((o) => `<button class="option" type="button" data-k="${o.k}"><i class="ph ph-circle" aria-hidden="true"></i>${o.t}</button>`).join('')}</div>`);
      $$('.option', box).forEach((b) => b.addEventListener('click', () => {
        const o = g.options[+b.dataset.k];
        if (o.ok) { b.classList.add('is-right'); completeChapter(i); }
        else { b.classList.add('is-wrong'); b.disabled = true; fail(i, 'Chưa đúng rồi. Đọc lại đoạn đầu chương một chút nhé.', b); }
      }));
    }

    if (g.type === 'order') {
      const shuffled = g.pieces.map((p, k) => ({ p, k })).sort(() => Math.random() - 0.5);
      box.innerHTML = gameShell(i, `<div class="answer-line" id="answer-${i}" data-empty="Câu ca dao sẽ hiện ở đây"></div>
        <div class="chips">${shuffled.map((s) => `<button class="chip" type="button" data-k="${s.k}">${s.p}</button>`).join('')}</div>`);
      let next = 0;
      $$('.chips .chip', box).forEach((b) => b.addEventListener('click', () => {
        if (+b.dataset.k === next) {
          b.classList.add('is-used');
          const s = document.createElement('span'); s.textContent = g.pieces[next];
          $('#answer-' + i).appendChild(s);
          if (hasGsap && !reduceMotion) gsap.from(s, { y: 12, opacity: 0, duration: 0.3, ease: 'back.out(1.6)' });
          next++;
          if (next === g.pieces.length) completeChapter(i);
        } else fail(i, 'Mảnh này đứng sau một chút. Thử mảnh khác nhé.', b);
      }));
    }

    if (g.type === 'match') {
      const left = g.pairs.map((p, k) => ({ t: p[0], k })).sort(() => Math.random() - 0.5);
      const right = g.pairs.map((p, k) => ({ t: p[1], k })).sort(() => Math.random() - 0.5);
      box.innerHTML = gameShell(i, `<div class="match-grid">
        <div class="match-col" aria-label="Vật dụng">${left.map((l) => `<button class="chip" type="button" data-side="l" data-k="${l.k}">${l.t}</button>`).join('')}</div>
        <div class="match-col" aria-label="Ý nghĩa">${right.map((r) => `<button class="chip" type="button" data-side="r" data-k="${r.k}">${r.t}</button>`).join('')}</div>
      </div>`);
      let pick = null, matched = 0;
      $$('.chip', box).forEach((b) => b.addEventListener('click', () => {
        if (!pick || pick.dataset.side === b.dataset.side) {
          if (pick) pick.classList.remove('is-selected');
          pick = b; b.classList.add('is-selected'); return;
        }
        if (pick.dataset.k === b.dataset.k) {
          [pick, b].forEach((x) => { x.classList.remove('is-selected'); x.classList.add('is-matched'); x.setAttribute('aria-disabled', 'true'); });
          matched++; pick = null;
          const fb = $('#fb-' + i); fb.className = 'feedback ok'; fb.textContent = `Đúng rồi. Còn ${g.pairs.length - matched} cặp.`;
          if (matched === g.pairs.length) completeChapter(i);
        } else {
          pick.classList.remove('is-selected'); pick = null;
          fail(i, 'Chưa khớp. Nghĩ về câu chuyện chương này rồi thử lại.', b);
        }
      }));
    }

    if (g.type === 'wish') {
      box.innerHTML = gameShell(i, `<div class="wish-list" role="radiogroup" aria-label="Điều tốt lành">
          ${g.wishes.map((w, k) => `<label><input type="radio" name="wish-${i}" value="${k}" ${k === 0 ? 'checked' : ''}>${w}</label>`).join('')}
        </div>
        <div class="field">
          <label for="wish-note-${i}">Lời nhắn thêm <span class="opt" style="color:var(--text-dim);font-weight:400">(không bắt buộc)</span></label>
          <input class="input" id="wish-note-${i}" maxlength="80" placeholder="Ví dụ: năm nay về nhà sớm hơn">
        </div>
        <button class="btn btn-primary" type="button" id="release-${i}"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i> Thả đèn trời</button>`);
      $('#release-' + i).addEventListener('click', (e) => {
        store.set('wish', { choice: +$(`input[name="wish-${i}"]:checked`).value, note: $('#wish-note-' + i).value.trim() });
        releaseLantern(e.currentTarget);
        completeChapter(i);
      });
    }
    $('#skip-' + i).addEventListener('click', () => { track('minigame_skip', { chapter: i + 1 }); completeChapter(i, true); });
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

  // Trang game sau khi xong + trang huy hiệu của chương
  function renderGameDone(i) {
    $('#game-' + i).innerHTML = `
      <div class="game-done"><span class="medal"><i class="ph-fill ph-check-fat" aria-hidden="true"></i></span>
        <span><strong>Bạn đã hoàn thành thử thách</strong><span>Lật trang để nhận huy hiệu.</span></span></div>
      <button class="btn btn-primary" type="button" data-goto="${P.badge(i)}">Nhận huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`;
  }
  function renderBadgePage(i, animate) {
    const c = CHAPTERS[i], on = book.done.has(i), last = i === CHAPTERS.length - 1;
    const pg = $('#badge-page-' + i);
    pg.innerHTML = `
      <p class="pg-kicker">Huy hiệu chương ${i + 1}</p>
      <div class="pg-medal ${on ? 'is-on' : ''}"><i class="ph${on ? '-fill' : ''} ph-${on ? 'medal' : 'lock-simple'}" aria-hidden="true"></i></div>
      <h3 class="pg-title">${c.badge.name}</h3>
      <p class="pg-prose">${on ? c.badge.desc : 'Hoàn thành thử thách ở trang bên để mở huy hiệu này.'}</p>
      ${on ? (last
        ? `<button class="btn btn-primary" type="button" data-goto="${P.summary}">Xem bộ huy hiệu <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`
        : `<button class="btn btn-primary" type="button" data-goto="${P.art(i + 1)}">Sang chương ${i + 2} <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`)
        : `<button class="btn btn-ghost" type="button" data-goto="${P.game(i)}"><i class="ph ph-arrow-left" aria-hidden="true"></i> Về thử thách</button>`}`;
    if (animate && hasGsap && !reduceMotion) gsap.from($('.pg-medal', pg), { scale: 0.3, rotation: -40, duration: 0.7, ease: 'back.out(2)', delay: 0.2 });
  }

  function completeChapter(i, skipped) {
    const first = !book.done.has(i);
    book.done.add(i);
    store.set('chapters_done', [...book.done]);
    sound.chime();
    track('chapter_complete', { chapter: i + 1, skipped: !!skipped });
    if (first) {
      track('badge_unlocked', { badge: CHAPTERS[i].badge.name });
      toast(`Bạn vừa mở ${CHAPTERS[i].badge.name}.`, 'gold', 'medal');
    }
    setTimeout(() => {
      renderGameDone(i);
      if (hasGsap && !reduceMotion) gsap.from($('#game-' + i + ' .game-done'), { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.6)' });
      renderBadgePage(i, true);
      syncTabs();
      renderBadges();
    }, skipped ? 0 : 500);
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

  let pass = store.get('pass', null); // { id, nickname, email?, consent, stamps:[], giftCode, claimed, synced }

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

  $('#form-register').addEventListener('submit', (e) => {
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
    const btn = $('#btn-register');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Đang tạo thẻ…</span>';

    const consent = fConsent.checked;
    const email = fEmail.value.trim();
    // Mô phỏng gọi máy chủ; mất mạng thì tạo ID cục bộ và đồng bộ sau (PDF A3)
    setTimeout(() => {
      pass = {
        id: 'TAO-' + randCode(6),
        nickname: fName.value.trim(),
        email: consent && email ? email : null, // từ chối consent: không lưu email
        consent,
        stamps: [],
        giftCode: 'QUA-' + randCode(4),
        claimed: false,
        synced: navigator.onLine
      };
      store.set('pass', pass);
      track('form_submit');
      track(consent ? 'consent_accepted' : 'consent_declined');
      track('virtual_id_created', { offline: !navigator.onLine });
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-label">Tạo thẻ thông hành</span>';
      if (!navigator.onLine) toast('Đang ngoại tuyến nên thẻ được tạo trên máy. Thẻ sẽ tự đồng bộ khi có mạng.', 'info', 'wifi-slash');
      else if (!consent && email) toast('Thẻ đã sẵn sàng. Vì bạn chưa đồng ý, chúng tôi không lưu email.', 'ok');
      else toast('Thẻ thông hành đã sẵn sàng. Đưa mã QR cho nhân sự ở mỗi trạm nhé.', 'ok', 'identification-card');
      $('#form-register').reset();
      renderTicket(true);
      if (window.innerWidth < 1000) $('#ticket-slot').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, 700);
  });

  $('#btn-restore').addEventListener('click', () => {
    // A7: xóa dữ liệu trình duyệt thì nhập lại Virtual ID (bản thật sẽ tra trên máy chủ)
    const v = (prompt('Nhập mã thẻ của bạn (dạng TAO-XXXXXX):') || '').trim().toUpperCase();
    if (!v) return;
    if (!/^TAO-[A-Z0-9]{6}$/.test(v)) { toast('Mã thẻ có dạng TAO- và 6 ký tự. Bạn xem lại giúp nhé.', 'err'); return; }
    if (pass && pass.id === v) { toast('Thẻ này đang mở trên máy rồi.', 'info'); return; }
    toast('Bản thử nghiệm chưa kết nối máy chủ nên chưa tải lại được thẻ. Nhân sự tại bàn check-in sẽ hỗ trợ bạn.', 'info', 'lifebuoy');
  });

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
            <div><dt>Mã thẻ</dt><dd class="mono">${pass.id}</dd></div>
            <div><dt>Ngày cấp</dt><dd>${fmtDate(pass.issuedAt)}</dd></div>
            <div><dt>Nơi cấp</dt><dd>Bếp lửa nhà mình</dd></div>
          </dl>
        </div>
        <div class="pp-qr-row">
          <div class="pp-qr" id="pp-qr" role="img" aria-label="Mã QR của thẻ ${pass.id}"></div>
          <p>Đưa mã QR này cho nhân sự ở mỗi trạm để đóng dấu.</p>
        </div>
        <div class="pp-mrz" aria-hidden="true"><span>${esc(l1)}</span><span>${esc(l2)}</span></div>
      </div>`;
    }
    if (n === PP.guide) return `<div class="pp-page">
        ${ppHead('HÀNH TRÌNH', 'TRANG 2')}
        <h4 class="pp-title">Bốn trạm, bốn dấu</h4>
        <p class="pp-note">Mỗi trạm đóng một dấu vào trang visa riêng. Đủ bốn dấu thì nhận quà ở bàn check-out.</p>
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
      const s = STATIONS[id - 1], on = pass.stamps.includes(id), st = STAMP_STYLE[id];
      return `<div class="pp-page pp-visa" style="--ink:${st.ink}">
        ${ppHead('VISA · TRẠM ' + ROMAN_ST[id - 1], 'TRANG ' + n)}
        <h4 class="pp-title">${s.name}</h4>
        <p class="pp-note">${VISA_TEXT[id]}</p>
        <div class="pp-stamp-zone ${on ? 'is-on' : ''}" data-zone="${id}">
          ${on
            ? `<div class="pp-stamp" data-stamp="${id}" style="--rot:${st.rot}deg;--dx:${st.x}px;--dy:${st.y}px">${stampSVG(id, stampedAt(id))}</div>`
            : `<p class="pp-empty"><i class="ph ph-stamp" aria-hidden="true"></i>Chỗ đóng dấu<small>Đến ${s.name} và đưa mã QR cho nhân sự</small></p>`}
        </div>
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
        <p class="pp-note">Ghi lại một khoảnh khắc đáng nhớ ở sự kiện.</p>
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
    if (typeof QRCode !== 'undefined') new QRCode(el, { text: 'https://chuyennhatao.vn/p/' + pass.id, width: 112, height: 112, colorDark: '#1b120c', colorLight: '#fffdf7', correctLevel: QRCode.CorrectLevel.M });
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
      ${n < 4 ? `<form class="code-entry pp-code" id="form-code" novalidate>
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
    bookEl.addEventListener('click', (e) => { const b = e.target.closest('[data-ppgo]'); if (b) ppGo(+b.dataset.ppgo); });

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
    pass.stamps.push(st.id);
    pass.stampedAt = Object.assign({}, pass.stampedAt, { [st.id]: Date.now() });
    store.set('pass', pass);
    track('stamp_added', { station: st.id });
    if (input) input.value = '';
    const complete = pass.stamps.length === 4;

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
      if (complete) later(() => { ppGo(PP.done); later(() => playStamp('gold'), reduceMotion ? 80 : 950); }, 1300);
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

  function renderCheckout() {
    const box = $('#checkout');
    if (!pass || pass.stamps.length < 4) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `
      <div><h3>Chúc mừng, bạn đã đi đủ bốn trạm</h3>
      <p style="color:var(--text-muted);margin-top:6px">${pass.claimed ? 'Quà đã được trao. Cảm ơn bạn đã đồng hành.' : 'Đưa mã này cho nhân sự tại bàn check-out. Mã chỉ dùng được một lần.'}</p></div>
      <p class="gift-code ${pass.claimed ? 'is-claimed' : ''}" aria-label="Mã nhận quà ${pass.giftCode.split('').join(' ')}">${pass.giftCode}</p>
      ${pass.claimed ? '' : '<button class="btn btn-ghost" type="button" id="btn-claim"><i class="ph ph-hand-heart" aria-hidden="true"></i> Nhân sự xác nhận đã trao quà</button>'}
      <div class="optin">
        <strong>Muốn nhận một bí mật nhỏ?</strong>
        <p style="color:var(--text-muted);font-size:15px">Tạo thẻ Vị Táo của riêng bạn để lưu lại một năm đáng nhớ.</p>
        <div class="optin-actions">
          <a class="btn btn-primary btn-sm" href="#the-vi-tao" id="optin-yes">Tạo thẻ Vị Táo</a>
          <button class="btn btn-quiet" type="button" id="optin-no">Để sau</button>
        </div>
      </div>`;
    const cb = $('#btn-claim');
    if (cb) cb.addEventListener('click', () => {
      if (pass.claimed) { toast('Mã quà này đã được dùng. Nếu có nhầm lẫn, bạn báo nhân sự giúp nhé.', 'info'); return; }
      pass.claimed = true; store.set('pass', pass);
      track('reward_claimed');
      toast('Đã ghi nhận trao quà. Chúc bạn một năm mới thật ấm.', 'gold', 'gift');
      renderCheckout();
    });
    $('#optin-yes').addEventListener('click', () => track('optin_yes'));
    $('#optin-no').addEventListener('click', () => { track('optin_no'); toast('Không sao. Thẻ Vị Táo luôn chờ bạn ở cuối trang.', 'info'); });
    if (hasGsap && !reduceMotion) gsap.from(box, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });
  }

  $('#btn-clear-local').addEventListener('click', () => {
    if (!confirm('Xóa thẻ, dấu trạm và tiến độ đọc sách trên máy này?')) return;
    store.clear();
    pass = null; book.done.clear(); book.idx = 0; book.started.clear();
    renderTicket(); renderAllChapters(); goPage(P.cover); moveIndicator(false);
    toast('Đã xóa dữ liệu trên máy này.', 'ok');
  });

  /* ======================================================================
   * S07–S08 · UGC "YEAR IN VALUES"
   * ==================================================================== */
  const VALUES = {
    thien: { name: 'Hướng Thiện', title: 'Táo Đức Thơm', desc: 'Sống thật lòng, biết nhận sai và gieo điều tử tế.' },
    am: { name: 'Mái Ấm', title: 'Táo Gương Hòa', desc: 'Người giữ lửa, luôn là chỗ dựa để cả nhà hòa thuận.' },
    nep: { name: 'Nếp Nhà', title: 'Táo Nếp Nhà', desc: 'Trân trọng cội nguồn, giữ lại những điều ông bà trao.' },
    tot: { name: 'Tốt Lành', title: 'Táo Vượt Vũ Môn', desc: 'Mang khát vọng cá chép, dám vươn lên trong năm mới.' }
  };
  const QUESTIONS = [
    { value: 'Tự soi xét và hướng thiện', q: 'Nhìn lại một năm, khoảnh khắc nào khiến bạn thấy mình tử tế hơn?',
      a: [['thien', 'Khi mình nhận sai và sửa ngay'], ['am', 'Khi mình nhường một bước để nhà yên'], ['nep', 'Khi mình về thăm ông bà dù bận'], ['tot', 'Khi mình dám bắt đầu lại điều đã bỏ dở']] },
    { value: 'Gìn giữ mái ấm và hòa thuận', q: 'Bữa cơm nhà bỗng căng thẳng vì một chuyện nhỏ. Bạn sẽ làm gì?',
      a: [['thien', 'Xin lỗi trước, kể cả khi mình không sai hết'], ['am', 'Gắp cho mỗi người một miếng, đổi sang chuyện vui'], ['nep', 'Nhắc lại chuyện xưa từng khiến cả nhà cười'], ['tot', 'Rủ cả nhà cùng lên kế hoạch cho năm mới']] },
    { value: 'Thành kính và trân trọng nếp nhà', q: 'Ngày 23 tháng Chạp, việc bạn muốn tự tay làm là gì?',
      a: [['thien', 'Dọn gian bếp thật sạch, như dọn lại lòng mình'], ['am', 'Nấu một mâm cơm để cả nhà ngồi cùng'], ['nep', 'Cùng bố mẹ chuẩn bị mâm cúng ông Táo'], ['tot', 'Thả cá chép, gửi một điều ước cho năm mới']] },
    { value: 'Khát vọng vươn lên', q: 'Điều bạn muốn mang theo sang năm mới là gì?',
      a: [['thien', 'Sống thật hơn với chính mình'], ['am', 'Nhiều bữa cơm đủ mặt cả nhà hơn'], ['nep', 'Một nếp nhà để kể lại cho con cháu'], ['tot', 'Một mục tiêu đủ lớn để mình cố gắng']] }
  ];
  const ugc = { step: 0, answers: store.get('ugc_answers', {}), ratio: '1:1', photo: null, caption: 0 };
  if (Object.keys(ugc.answers).length === 4) ugc.step = 4;

  function renderQuiz(animate) {
    const box = $('#quiz');
    if (ugc.step >= QUESTIONS.length) {
      const r = result();
      box.innerHTML = `
        <div class="quiz-top"><span class="quiz-count">Hoàn thành</span><div class="quiz-dots" aria-hidden="true">${QUESTIONS.map(() => '<span class="on"></span>').join('')}</div></div>
        <p class="quiz-value">Danh hiệu của bạn</p>
        <p class="quiz-q">${r.v.title}</p>
        <p style="color:var(--text-muted)">${r.v.desc} Thẻ đã sẵn sàng ở bên cạnh. Thêm ảnh nếu muốn, rồi tải về.</p>
        <div class="quiz-nav"><button class="btn btn-ghost btn-sm" type="button" id="quiz-redo"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i> Làm lại</button></div>`;
      $('#quiz-redo').addEventListener('click', () => { ugc.answers = {}; ugc.step = 0; store.set('ugc_answers', {}); renderQuiz(true); drawCard(); });
    } else {
      const Q = QUESTIONS[ugc.step];
      box.innerHTML = `
        <div class="quiz-top"><span class="quiz-count">Câu ${ugc.step + 1}/${QUESTIONS.length}</span>
          <div class="quiz-dots" aria-hidden="true">${QUESTIONS.map((_, i) => `<span class="${i <= ugc.step ? 'on' : ''}"></span>`).join('')}</div></div>
        <p class="quiz-value">${Q.value}</p>
        <p class="quiz-q" id="quiz-q">${Q.q}</p>
        <div class="options" role="radiogroup" aria-labelledby="quiz-q">${Q.a.map(([v, t]) => `<button class="option ${ugc.answers[ugc.step] === v ? 'is-right' : ''}" type="button" role="radio" aria-checked="${ugc.answers[ugc.step] === v}" data-v="${v}"><i class="ph ph-circle" aria-hidden="true"></i>${t}</button>`).join('')}</div>
        <div class="quiz-nav">${ugc.step > 0 ? '<button class="btn btn-quiet" type="button" id="quiz-back"><i class="ph ph-arrow-left" aria-hidden="true"></i> Câu trước</button>' : '<span></span>'}</div>`;
      $$('.option', box).forEach((b) => b.addEventListener('click', () => {
        ugc.answers[ugc.step] = b.dataset.v;
        store.set('ugc_answers', ugc.answers);
        b.classList.add('is-right');
        setTimeout(() => { ugc.step++; renderQuiz(true); if (ugc.step === 4) { drawCard(); track('frame_generated', { title: result().v.title }); } }, 220);
      }));
      const back = $('#quiz-back');
      if (back) back.addEventListener('click', () => { ugc.step--; renderQuiz(true); });
    }
    if (animate && hasGsap && !reduceMotion) gsap.from($$('#quiz > *'), { x: 24, opacity: 0, stagger: 0.05, duration: 0.35, ease: 'power2.out' });
  }

  function result() {
    const counts = { thien: 0, am: 0, nep: 0, tot: 0 };
    Object.values(ugc.answers).forEach((v) => { counts[v]++; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const order = ['thien', 'am', 'nep', 'tot'];
    // Hòa điểm: ưu tiên giá trị trả lời ở câu cuối cùng (cảm xúc gần nhất)
    let top = order[0];
    order.forEach((k) => { if (counts[k] > counts[top]) top = k; });
    const tied = order.filter((k) => counts[k] === counts[top]);
    if (tied.length > 1 && ugc.answers[3] && tied.includes(ugc.answers[3])) top = ugc.answers[3];
    return { top, v: VALUES[top], pct: Object.fromEntries(order.map((k) => [k, Math.round((counts[k] / total) * 100)])), done: Object.keys(ugc.answers).length === 4 };
  }

  function renderDist(r) {
    const el = $('#dist');
    if (!r.done) { el.innerHTML = ''; return; }
    el.innerHTML = Object.keys(VALUES).map((k) => `
      <div class="dist-row ${k === r.top ? 'top' : ''}"><span>${VALUES[k].name}</span>
        <span><span class="bar" style="display:block;width:${Math.max(r.pct[k], 2)}%"></span></span>
        <span class="pct">${r.pct[k]}%</span></div>`).join('');
    if (hasGsap && !reduceMotion) gsap.from('#dist .bar', { scaleX: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' });
  }

  async function drawCard() {
    const r = result();
    const cv = $('#ugc-canvas'), ctx = cv.getContext('2d');
    const W = 1080, H = ugc.ratio === '9:16' ? 1920 : 1080;
    cv.width = W; cv.height = H;
    try { await document.fonts.load('800 80px "Be Vietnam Pro"'); await document.fonts.load('500 40px "Be Vietnam Pro"'); } catch (e) { /* dùng font dự phòng */ }
    const F = (w, s) => `${w} ${s}px "Be Vietnam Pro", system-ui, sans-serif`;

    // Nền đêm + quầng đèn trời
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a140a'); g.addColorStop(1, '#120b07');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const seed = (pass && pass.id) || 'TAO';
    let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 9973;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H * 0.9, rad = 4 + rnd() * 10;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, rad * 6);
      rg.addColorStop(0, 'rgba(255,110,40,.55)'); rg.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = rg; ctx.fillRect(x - rad * 6, y - rad * 6, rad * 12, rad * 12);
      ctx.fillStyle = '#ff5a2a'; ctx.fillRect(x - rad * 0.6, y - rad, rad * 1.2, rad * 1.6);
    }
    ctx.strokeStyle = 'rgba(255,226,196,.25)'; ctx.lineWidth = 3; ctx.strokeRect(40, 40, W - 80, H - 80);

    const tall = H > W;
    let y = tall ? 220 : 120;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8a6b'; ctx.font = F(600, 32);
    ctx.fillText('CHUYỆN NHÀ TÁO  ·  YEAR IN VALUES', W / 2, y);

    // Ảnh người dùng (tròn) hoặc dấu son
    const ph = tall ? 420 : 300;
    const cy = y + 70 + ph / 2;
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, ph / 2, 0, Math.PI * 2); ctx.clip();
    if (ugc.photo) {
      const im = ugc.photo, sc = Math.max(ph / im.width, ph / im.height);
      ctx.drawImage(im, W / 2 - (im.width * sc) / 2, cy - (im.height * sc) / 2, im.width * sc, im.height * sc);
    } else {
      ctx.fillStyle = '#d63b20'; ctx.fillRect(W / 2 - ph / 2, cy - ph / 2, ph, ph);
      ctx.fillStyle = '#fff'; ctx.font = F(800, ph * 0.3); ctx.textBaseline = 'middle'; ctx.fillText('Táo', W / 2, cy + 6); ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    ctx.strokeStyle = '#e9b44c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(W / 2, cy, ph / 2 + 10, 0, Math.PI * 2); ctx.stroke();

    y = cy + ph / 2 + (tall ? 130 : 90);
    ctx.fillStyle = '#c4b3a0'; ctx.font = F(500, 36);
    ctx.fillText((pass && pass.nickname) || 'Người giữ lửa', W / 2, y);
    y += tall ? 110 : 84;
    ctx.fillStyle = '#f4ece1'; ctx.font = F(800, tall ? 96 : 76);
    ctx.fillText(r.done ? r.v.title : 'Vị Táo của bạn', W / 2, y);
    y += tall ? 70 : 56;
    ctx.fillStyle = '#c4b3a0'; ctx.font = F(500, 32);
    wrap(ctx, r.done ? r.v.desc : 'Trả lời bốn câu hỏi để mở danh hiệu.', W / 2, y, W - 240, 44);

    if (r.done && tall) {
      // Biểu đồ phân bố 4 giá trị (chỉ khổ story có đủ chỗ)
      let by = y + 150;
      ctx.textAlign = 'left';
      Object.keys(VALUES).forEach((k) => {
        ctx.fillStyle = '#f4ece1'; ctx.font = F(600, 34); ctx.fillText(VALUES[k].name, 160, by);
        ctx.fillStyle = k === r.top ? '#e9b44c' : '#ff8a6b';
        ctx.fillRect(420, by - 22, Math.max(8, (W - 640) * r.pct[k] / 100), 16);
        ctx.textAlign = 'right'; ctx.fillStyle = '#f4ece1'; ctx.fillText(r.pct[k] + '%', W - 160, by); ctx.textAlign = 'left';
        by += 76;
      });
      ctx.textAlign = 'center';
    }
    ctx.fillStyle = '#9c8a78'; ctx.font = F(600, 30);
    ctx.fillText('#ChuyenNhaTao  #YearInValues', W / 2, H - 100);

    $('#result-title').textContent = r.done ? r.v.title : 'Thẻ Vị Táo của bạn';
    $('#result-desc').textContent = r.done ? r.v.desc : 'Trả lời bốn câu hỏi để xem danh hiệu.';
    renderDist(r);
    renderCaptions(r);
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '';
    words.forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t;
    });
    ctx.fillText(line, x, y);
  }

  function captionsFor(r) {
    const t = r.done ? r.v.title : 'một vị Táo';
    return [
      `Bếp đỏ giữ lửa, nếp nhà đoàn viên. Năm nay mình là "${t}". Còn bạn là vị Táo nào? #ChuyenNhaTao #YearInValues`,
      `23 tháng Chạp, tiễn ông Táo về trời và nhìn lại một năm. Danh hiệu của mình: ${t}. #ChuyenNhaTao #YearInValues`,
      `Một năm của mình gói trong bốn giá trị: hướng thiện, mái ấm, nếp nhà, tốt lành. Mình là ${t}. #ChuyenNhaTao #YearInValues`
    ];
  }
  function renderCaptions(r) {
    $('#captions').innerHTML = captionsFor(r).map((c, i) => `<button class="caption" type="button" data-c="${i}"><i class="ph ph-copy" aria-hidden="true"></i><span>${esc(c)}</span></button>`).join('');
    $$('#captions .caption').forEach((b) => b.addEventListener('click', () => copyCaption(+b.dataset.c)));
  }
  async function copyCaption(i) {
    const text = captionsFor(result())[i];
    ugc.caption = i;
    try { await navigator.clipboard.writeText(text); toast('Đã sao chép caption. Dán vào bài đăng là xong.', 'ok', 'copy'); }
    catch (e) { toast('Chưa sao chép được tự động. Bạn giữ và chọn đoạn caption để sao chép nhé.', 'info'); }
    track('copy_caption', { version: i + 1 });
  }

  $('#ugc-photo').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    const status = $('#ugc-photo-status');
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Tệp này không phải ảnh. Bạn chọn ảnh JPG hoặc PNG nhé.', 'err'); return; }
    if (file.size > 20 * 1024 * 1024) { toast('Ảnh lớn hơn 20MB. Bạn chọn ảnh nhỏ hơn giúp nhé.', 'err'); return; }
    status.textContent = 'Đang xử lý ảnh…';
    const img = new Image();
    img.onload = () => {
      // Nén về tối đa 1200px, xử lý hoàn toàn trên máy
      const sc = Math.min(1, 1200 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * sc; c.height = img.height * sc;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const out = new Image();
      out.onload = () => { ugc.photo = out; drawCard(); status.textContent = 'Đã thêm ảnh. Chọn ảnh khác để thay.'; URL.revokeObjectURL(img.src); };
      out.src = c.toDataURL('image/jpeg', 0.9);
    };
    img.onerror = () => { status.textContent = 'Chưa đọc được ảnh này. Thử ảnh khác nhé.'; toast('Chưa đọc được ảnh này. Thử ảnh khác nhé.', 'err'); };
    img.src = URL.createObjectURL(file);
  });

  $$('#ratio-seg button').forEach((b) => b.addEventListener('click', () => {
    ugc.ratio = b.dataset.ratio;
    $$('#ratio-seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    drawCard();
  }));

  function cardBlob() { return new Promise((res) => $('#ugc-canvas').toBlob(res, 'image/png')); }
  $('#btn-download').addEventListener('click', async () => {
    const r = result();
    const blob = await cardBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ChuyenNhaTao-${(r.done ? r.v.title : 'the-vi-tao').replace(/\s+/g, '-')}-${ugc.ratio.replace(':', 'x')}.png`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    track('download', { ratio: ugc.ratio });
  });
  async function share(network) {
    track('share_click', { network });
    const text = captionsFor(result())[ugc.caption];
    const blob = await cardBlob();
    const file = new File([blob], 'the-vi-tao.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); } catch (e) { /* bỏ qua */ }
    if (network === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(location.origin + location.pathname), '_blank', 'noopener,width=640,height=560');
      toast('Caption đã được sao chép. Tải thẻ về để đính kèm ảnh vào bài đăng.', 'info', 'facebook-logo');
    } else {
      toast('Caption đã được sao chép. Tải thẻ về, mở TikTok và đăng ảnh kèm caption nhé.', 'info', 'tiktok-logo');
    }
  }
  $('#btn-share-fb').addEventListener('click', () => share('facebook'));
  $('#btn-share-tt').addEventListener('click', () => share('tiktok'));

  /* ======================================================================
   * Khởi tạo nội dung
   * ==================================================================== */
  function renderAllChapters() {
    CHAPTERS.forEach((c, i) => {
      if (book.done.has(i)) renderGameDone(i); else renderGame(i);
      renderBadgePage(i);
    });
    renderBadges();
    syncTabs();
  }
  renderAllChapters();
  initFlipbook();
  renderTicket();
  renderQuiz();
  drawCard();
  requestAnimationFrame(() => moveIndicator(false));

  document.addEventListener('copy', () => {}, { passive: true });
  window.addEventListener('pagehide', stopVoice);

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
  ['doc-sach', 'tram-trai-nghiem', 'the-vi-tao'].forEach((id) => {
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
