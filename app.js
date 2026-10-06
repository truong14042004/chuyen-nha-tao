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

  const book = {
    idx: Math.min(store.get('chapter', 0), 3),
    done: new Set(store.get('chapters_done', [])),
    fails: 0
  };
  const tabsEl = $('#chapter-tabs');
  CHAPTERS.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chapter-tab'; b.setAttribute('role', 'tab'); b.id = 'tab-' + i;
    b.setAttribute('aria-controls', 'book');
    b.innerHTML = `<span class="n">Chương ${i + 1}<i class="ph-fill ph-seal-check" aria-hidden="true" hidden></i></span><span class="t">${c.short}</span>`;
    b.addEventListener('click', () => goChapter(i));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
        $('#tab-' + n).focus(); goChapter(n);
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

  function renderChapter() {
    const c = CHAPTERS[book.idx];
    book.fails = 0;
    const art = $('#page-art');
    art.classList.remove('has-img');
    art.innerHTML = `
      <i class="ph ph-${c.icon} art-icon" aria-hidden="true"></i>
      <span class="art-num" aria-hidden="true">${book.idx + 1}</span>
      <p class="seed-q"><small>Câu hỏi gieo</small>${c.seed}</p>`;
    // Tranh minh hoạ chương; thiếu ảnh thì giữ icon làm dự phòng
    const img = new Image();
    img.className = 'art-img';
    img.alt = c.alt;
    img.decoding = 'async';
    img.style.objectPosition = c.pos || 'center';
    img.onload = () => { if (art.isConnected && CHAPTERS[book.idx] === c) { art.prepend(img); art.classList.add('has-img'); } };
    img.src = c.img;
    // Tải trước tranh chương kế để lật trang không bị chờ
    const nx = CHAPTERS[book.idx + 1];
    if (nx) { const pre = new Image(); pre.src = nx.img; }
    const done = book.done.has(book.idx);
    $('#page-text').innerHTML = `
      <div>
        <p class="meaning">Chương ${book.idx + 1} · ${c.meaning}</p>
        <h3 style="margin-top:6px">${c.title}</h3>
      </div>
      <p class="story">${c.story}</p>
      <div class="page-tools">
        <button class="btn btn-ghost btn-sm" type="button" id="btn-voice"><i class="ph ph-speaker-high" aria-hidden="true"></i> <span>Nghe đọc</span></button>
      </div>
      <div class="game" id="game"></div>`;
    $('#btn-voice').addEventListener('click', voiceOver);
    if (done) renderGameDone(); else renderGame();
    syncTabs();
    track('chapter_start', { chapter: book.idx + 1 });
  }

  function goChapter(i) {
    if (i === book.idx) return;
    const dir = i > book.idx ? 1 : -1;
    book.idx = i; store.set('chapter', i);
    stopVoice();
    sound.flip();
    moveIndicator(true);
    const leaf = $('.leaf');
    if (hasGsap && !reduceMotion) {
      // Lật trang: tờ giấy quay quanh gáy sách, đổi nội dung ở giữa vòng lật
      gsap.timeline()
        .set(leaf, { opacity: 1, rotateY: dir > 0 ? 0 : -180 })
        .to(leaf, { rotateY: dir > 0 ? -90 : -90, duration: 0.28, ease: 'power2.in' })
        .add(renderChapter)
        .to(leaf, { rotateY: dir > 0 ? -180 : 0, duration: 0.32, ease: 'power2.out' })
        .set(leaf, { opacity: 0 })
        .from(['#page-art > *', '#page-text > *'], { opacity: 0, y: 10, stagger: 0.04, duration: 0.3, ease: 'power2.out' }, '-=0.2');
    } else {
      renderChapter();
    }
  }

  // Voice-over (PDF S02): ưu tiên file thu âm audio/chuong-N.mp3.
  // Chưa có file thì dùng giọng máy, nhưng CHỈ khi trình duyệt có giọng tiếng Việt
  // (Windows mặc định chỉ có giọng Anh: đọc chữ Việt bằng giọng Anh nghe rất sai).
  let speaking = false;
  let audioEl = null;
  const setVoiceLabel = (btn, on) => { if (btn && btn.isConnected) btn.querySelector('span').textContent = on ? 'Dừng đọc' : 'Nghe đọc'; };
  function stopVoice() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (audioEl) { audioEl.pause(); audioEl = null; }
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

  function voiceOver(e) {
    const btn = e.currentTarget;
    if (speaking) { stopVoice(); setVoiceLabel(btn, false); return; }
    const c = CHAPTERS[book.idx];
    speaking = true; setVoiceLabel(btn, true);
    track('voice_play', { chapter: book.idx + 1 });
    audioEl = new Audio(`audio/chuong-${book.idx + 1}.mp3`);
    audioEl.onended = () => { speaking = false; audioEl = null; setVoiceLabel(btn, false); };
    audioEl.onerror = () => { audioEl = null; if (speaking) speakTTS(c, btn); };
    audioEl.play().catch(() => { /* lỗi tải file sẽ đi vào onerror */ });
  }

  // ------------------------------------------------------------ mini-game
  function gameShell(c, body) {
    return `<div class="game-head"><h4><i class="ph ph-puzzle-piece" aria-hidden="true"></i>${c.game.label}</h4><button class="btn btn-quiet" type="button" id="btn-skip" hidden>Bỏ qua</button></div>
      <p class="game-prompt">${c.game.q}</p>${body}<p class="feedback" id="feedback" role="status"></p>`;
  }
  function fail(msg, el) {
    book.fails++;
    const fb = $('#feedback'); fb.className = 'feedback err'; fb.textContent = msg;
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    // PDF S02: có nút bỏ qua mini-game sau lần sai thứ 3
    if (book.fails >= 3) $('#btn-skip').hidden = false;
  }

  function renderGame() {
    const c = CHAPTERS[book.idx], g = c.game, box = $('#game');
    if (g.type === 'quiz') {
      const opts = g.options.map((o, i) => ({ ...o, i })).sort(() => Math.random() - 0.5);
      box.innerHTML = gameShell(c, `<div class="options">${opts.map((o) => `<button class="option" type="button" data-i="${o.i}"><i class="ph ph-circle" aria-hidden="true"></i>${o.t}</button>`).join('')}</div>`);
      $$('.option', box).forEach((b) => b.addEventListener('click', () => {
        const o = g.options[+b.dataset.i];
        if (o.ok) { b.classList.add('is-right'); completeChapter(); }
        else { b.classList.add('is-wrong'); b.disabled = true; fail('Chưa đúng rồi. Đọc lại đoạn đầu chương một chút nhé.', b); }
      }));
    }

    if (g.type === 'order') {
      const shuffled = g.pieces.map((p, i) => ({ p, i })).sort(() => Math.random() - 0.5);
      box.innerHTML = gameShell(c, `<div class="answer-line" id="answer" data-empty="Câu ca dao sẽ hiện ở đây"></div>
        <div class="chips" id="pieces">${shuffled.map((s) => `<button class="chip" type="button" data-i="${s.i}">${s.p}</button>`).join('')}</div>`);
      let next = 0;
      $$('#pieces .chip', box).forEach((b) => b.addEventListener('click', () => {
        if (+b.dataset.i === next) {
          b.classList.add('is-used');
          const s = document.createElement('span'); s.textContent = g.pieces[next];
          $('#answer').appendChild(s);
          if (hasGsap && !reduceMotion) gsap.from(s, { y: 12, opacity: 0, duration: 0.3, ease: 'back.out(1.6)' });
          next++;
          if (next === g.pieces.length) completeChapter();
        } else fail('Mảnh này đứng sau một chút. Thử mảnh khác nhé.', b);
      }));
    }

    if (g.type === 'match') {
      const left = g.pairs.map((p, i) => ({ t: p[0], i })).sort(() => Math.random() - 0.5);
      const right = g.pairs.map((p, i) => ({ t: p[1], i })).sort(() => Math.random() - 0.5);
      box.innerHTML = gameShell(c, `<div class="match-grid">
        <div class="match-col" aria-label="Vật dụng">${left.map((l) => `<button class="chip" type="button" data-side="l" data-i="${l.i}">${l.t}</button>`).join('')}</div>
        <div class="match-col" aria-label="Ý nghĩa">${right.map((r) => `<button class="chip" type="button" data-side="r" data-i="${r.i}">${r.t}</button>`).join('')}</div>
      </div>`);
      let pick = null, matched = 0;
      $$('.chip', box).forEach((b) => b.addEventListener('click', () => {
        if (!pick || pick.dataset.side === b.dataset.side) {
          if (pick) pick.classList.remove('is-selected');
          pick = b; b.classList.add('is-selected'); return;
        }
        if (pick.dataset.i === b.dataset.i) {
          [pick, b].forEach((x) => { x.classList.remove('is-selected'); x.classList.add('is-matched'); x.setAttribute('aria-disabled', 'true'); });
          matched++; pick = null;
          const fb = $('#feedback'); fb.className = 'feedback ok'; fb.textContent = `Đúng rồi. Còn ${g.pairs.length - matched} cặp.`;
          if (matched === g.pairs.length) completeChapter();
        } else {
          pick.classList.remove('is-selected'); pick = null;
          fail('Chưa khớp. Nghĩ về câu chuyện chương này rồi thử lại.', b);
        }
      }));
    }

    if (g.type === 'wish') {
      box.innerHTML = gameShell(c, `<div class="wish-list" role="radiogroup" aria-label="Điều tốt lành">
          ${g.wishes.map((w, i) => `<label><input type="radio" name="wish" value="${i}" ${i === 0 ? 'checked' : ''}>${w}</label>`).join('')}
        </div>
        <div class="field">
          <label for="wish-note">Lời nhắn thêm <span class="opt" style="color:var(--text-dim);font-weight:400">(không bắt buộc, tối đa 80 ký tự)</span></label>
          <input class="input" id="wish-note" maxlength="80" placeholder="Ví dụ: năm nay về nhà sớm hơn">
        </div>
        <button class="btn btn-primary" type="button" id="btn-release"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i> Thả đèn trời</button>`);
      $('#btn-release').addEventListener('click', (e) => {
        store.set('wish', { choice: +$('input[name="wish"]:checked').value, note: $('#wish-note').value.trim() });
        releaseLantern(e.currentTarget);
        completeChapter();
      });
    }
    $('#btn-skip').addEventListener('click', () => { track('minigame_skip', { chapter: book.idx + 1 }); completeChapter(true); });
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

  function renderGameDone() {
    const c = CHAPTERS[book.idx];
    const last = book.idx === CHAPTERS.length - 1;
    $('#game').innerHTML = `
      <div class="game-done"><span class="medal"><i class="ph-fill ph-medal" aria-hidden="true"></i></span>
        <span><strong>${c.badge.name}</strong><span>${c.badge.desc}</span></span></div>
      <div>${last
        ? `<a class="btn btn-primary" href="#tong-ket">Xem bộ huy hiệu <i class="ph ph-arrow-down" aria-hidden="true"></i></a>`
        : `<button class="btn btn-primary" type="button" id="btn-next">Sang chương ${book.idx + 2} <i class="ph ph-arrow-right" aria-hidden="true"></i></button>`}</div>`;
    const nb = $('#btn-next');
    if (nb) nb.addEventListener('click', () => {
      goChapter(book.idx + 1);
      $('#doc-sach').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function completeChapter(skipped) {
    const first = !book.done.has(book.idx);
    book.done.add(book.idx);
    store.set('chapters_done', [...book.done]);
    sound.chime();
    track('chapter_complete', { chapter: book.idx + 1, skipped: !!skipped });
    if (first) {
      track('badge_unlocked', { badge: CHAPTERS[book.idx].badge.name });
      toast(`Bạn vừa mở ${CHAPTERS[book.idx].badge.name}.`, 'gold', 'medal');
    }
    setTimeout(() => {
      renderGameDone();
      if (hasGsap && !reduceMotion) gsap.from('.game-done', { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.6)' });
      syncTabs();
      renderBadges(book.idx);
    }, skipped ? 0 : 500);
  }

  /* ======================================================================
   * S03 · Tổng kết 4 huy hiệu
   * ==================================================================== */
  function renderBadges(justUnlocked) {
    $('#badges').innerHTML = CHAPTERS.map((c, i) => {
      const on = book.done.has(i);
      return `<div class="badge ${on ? 'is-unlocked' : ''}" data-badge="${i}">
        <span class="disc"><i class="ph${on ? '-fill' : ''} ph-${on ? 'medal' : 'lock-simple'}" aria-hidden="true"></i></span>
        <h4>${c.badge.name}</h4>
        <p>${on ? c.badge.desc : 'Hoàn thành chương ' + (i + 1) + ' để mở'}</p>
      </div>`;
    }).join('');
    if (hasGsap && !reduceMotion && justUnlocked !== undefined && book.done.has(justUnlocked)) {
      gsap.from(`[data-badge="${justUnlocked}"] .disc`, { scale: 0.3, rotation: -40, duration: 0.7, ease: 'back.out(2)' });
    }
    const n = book.done.size;
    $('[data-summary-title]').textContent = n === 4
      ? 'Bạn đã gom đủ bốn huy hiệu'
      : n === 0 ? 'Gom đủ bốn huy hiệu, rồi gặp nhau ở sự kiện' : `Bạn đã có ${n}/4 huy hiệu`;
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

  function renderTicket(animate) {
    const slot = $('#ticket-slot');
    if (!pass) {
      slot.innerHTML = `<div class="ticket ticket-empty">
        <i class="ph ph-identification-card" aria-hidden="true"></i>
        <strong>Thẻ của bạn sẽ hiện ở đây</strong>
        <span>Gồm mã QR riêng và bốn ô dấu cho bốn trạm.</span>
        <div style="display:grid;gap:8px;width:100%;max-width:260px;margin-top:8px" aria-hidden="true">
          <div class="skeleton" style="height:12px"></div><div class="skeleton" style="height:12px;width:70%"></div>
        </div></div>`;
      $('#checkout').hidden = true;
      return;
    }
    const n = pass.stamps.length;
    slot.innerHTML = `<div class="ticket theme-dark" id="ticket">
      <div class="ticket-top">
        <div><p class="label">Chủ thẻ</p><p class="name">${esc(pass.nickname)}</p></div>
        <div style="text-align:right"><p class="label">Mã thẻ</p><p class="ticket-id">${pass.id}</p></div>
      </div>
      <div class="ticket-body">
        <div class="qr-box"><div class="qr" id="qr" role="img" aria-label="Mã QR của thẻ ${pass.id}"></div><span>${pass.id}</span></div>
        <div>
          <p class="progress-text" aria-live="polite"><strong>${n}/4</strong> trạm đã đóng dấu</p>
          <div class="stamps" style="margin-top:12px">${STATIONS.map((s) => {
            const on = pass.stamps.includes(s.id);
            return `<div class="stamp ${on ? 'is-done' : ''}" data-station="${s.id}">
              <span class="mark" aria-hidden="true"><i class="ph-fill ph-seal-check"></i></span>
              <span class="st-name">${s.name}</span>
              <span class="st-state">${on ? '<i class="ph ph-check" aria-hidden="true"></i> Đã đóng dấu' : 'Chưa đóng dấu'}</span>
            </div>`;
          }).join('')}</div>
        </div>
      </div>
      ${n < 4 ? `<form class="code-entry" id="form-code" novalidate>
        <label for="f-code" style="font-weight:600;font-size:15px">Mã QR mờ hoặc không quét được? Nhập mã trạm</label>
        <div class="code-row">
          <input class="input" id="f-code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="6 ký tự" aria-describedby="f-code-help">
          <button class="btn btn-primary" type="submit">Đóng dấu</button>
        </div>
        <p class="help" id="f-code-help">Bản thử nghiệm: mã các trạm là HUONG1, MAIAM2, NEPNH3, TOTLA4.</p>
      </form>` : ''}
    </div>`;

    const qrEl = $('#qr');
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrEl, { text: 'https://chuyennhatao.vn/p/' + pass.id, width: 160, height: 160, colorDark: '#1b120c', colorLight: '#fffaf3', correctLevel: QRCode.CorrectLevel.M });
    } else {
      qrEl.innerHTML = `<p style="font-size:12px;text-align:center;padding-top:60px">Không tải được mã QR. Dùng mã thẻ bên dưới.</p>`;
    }

    const fc = $('#form-code');
    if (fc) fc.addEventListener('submit', (e) => { e.preventDefault(); addStamp($('#f-code').value); });

    if (animate && hasGsap && !reduceMotion) {
      gsap.from('#ticket', { y: 30, opacity: 0, rotateX: 12, transformPerspective: 900, duration: 0.7, ease: 'power3.out' });
    }
    renderCheckout();
  }

  function addStamp(raw) {
    const code = String(raw || '').trim().toUpperCase();
    const input = $('#f-code');
    const st = STATIONS.find((s) => s.code === code);
    track('qr_scan', { station: st ? st.id : null, valid: !!st });
    if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Mã trạm gồm 6 ký tự, in dưới mã QR của trạm.', 'err'); input && input.classList.add('shake'); return; }
    if (!st) { toast('Mã này chưa khớp với trạm nào. Bạn kiểm tra lại hoặc nhờ nhân sự quét giúp nhé.', 'err'); input && input.classList.add('shake'); return; }
    if (pass.stamps.includes(st.id)) { toast(`${st.name} đã đóng dấu cho bạn rồi.`, 'info', 'seal-check'); return; }
    pass.stamps.push(st.id);
    store.set('pass', pass);
    sound.chime();
    track('stamp_added', { station: st.id });
    renderTicket(false);
    const mark = $(`[data-station="${st.id}"] .mark`);
    if (hasGsap && !reduceMotion && mark) {
      // Dấu mộc rơi xuống và đóng chặt (phản hồi thao tác)
      gsap.fromTo(mark, { scale: 2.4, opacity: 0, rotation: -50 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.55, ease: 'back.out(2.2)' });
      gsap.fromTo(`[data-station="${st.id}"]`, { scale: 1 }, { scale: 0.97, duration: 0.08, yoyo: true, repeat: 1, delay: 0.3 });
    }
    if (pass.stamps.length === 4) {
      track('passport_complete');
      toast('Đủ bốn dấu rồi. Mời bạn đến bàn check-out nhận quà.', 'gold', 'gift');
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
    pass = null; book.done.clear(); book.idx = 0;
    renderTicket(); renderBadges(); renderChapter(); moveIndicator(false);
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
  renderChapter();
  renderBadges();
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

    gsap.from('#badges .badge', {
      opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, grid: 'auto' }, ease: 'back.out(1.4)',
      scrollTrigger: { trigger: '#badges', start: 'top 85%' }
    });
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
