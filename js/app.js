/* ==========================================================
   お小遣い帳 — アプリ本体
   依存ライブラリなし。データは localStorage に保存する。
   ========================================================== */
(() => {
  'use strict';

  /* ---------- 小道具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const yen = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ja-JP');
  const yenSigned = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(Math.round(n)).toLocaleString('ja-JP');
  const pad2 = (n) => String(n).padStart(2, '0');
  const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function toLocalInput(d) {
    d = new Date(d);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  function fmtDateHeading(d) {
    d = new Date(d);
    const now = new Date();
    const y = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}年`;
    return `${y}${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
  }
  function fmtTime(d) { d = new Date(d); return `${d.getHours()}:${pad2(d.getMinutes())}`; }
  function dayKey(d) { d = new Date(d); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function monthEnd(y, m) { return new Date(y, m + 1, 0, 23, 59, 59, 999); }

  /* ---------- アイコン ---------- */
  const I = {
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    walletTab: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17a1.5 1.5 0 0 1 0 3H6.5a.5.5 0 0 0 0 1H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-12zm12.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>',
    transferTab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/></svg>',
    chartTab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19L10 12l4 4 6-8"/><path d="M15 8h5v5"/></svg>',
    settingsTab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    arrowRL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16m0 0l-3-3m3 3l3-3"/><path d="M17 20V4m0 0l-3 3m3-3l3 3"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v18m0 0l-4-4m4 4l4-4"/><path d="M16 21V3m0 0l-4 4m4-4l4 4"/></svg>',
    adjust: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M12 4l4 4-4 4"/><path d="M12 20l-4-4 4-4"/></svg>',
    handle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 9h14M5 15h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  };

  const PALETTE = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e', '#8e8e93', '#1c1c1e', '#6b8e23'];

  /* ---------- 保存領域 ---------- */
  const KEY = 'okozukai.v1';
  let memoryFallback = null;
  const store = {
    wallets: [],
    tx: [],
    settings: {},
  };

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = memoryFallback; }
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      store.wallets = Array.isArray(data.wallets) ? data.wallets : [];
      store.tx = Array.isArray(data.tx) ? data.tx : [];
      store.settings = data.settings || {};
    } catch (e) { /* 壊れたデータは無視する */ }
  }
  function save() {
    const raw = JSON.stringify({ version: 1, wallets: store.wallets, tx: store.tx, settings: store.settings, savedAt: new Date().toISOString() });
    try { localStorage.setItem(KEY, raw); } catch (e) { memoryFallback = raw; }
  }

  const walletById = (id) => store.wallets.find((w) => w.id === id);
  const txOf = (walletId) => store.tx.filter((t) => t.walletId === walletId);
  const balance = (walletId, until) => store.tx.reduce((s, t) => (t.walletId === walletId && (!until || new Date(t.at) <= until) ? s + t.amount : s), 0);
  const totalBalance = (until) => store.wallets.reduce((s, w) => (w.inTotal ? s + balance(w.id, until) : s), 0);

  function monthStats(walletIds, y, m) {
    const from = new Date(y, m, 1), to = monthEnd(y, m);
    let inc = 0, exp = 0;
    for (const t of store.tx) {
      if (!walletIds.includes(t.walletId) || t.kind === 'transfer' || t.kind === 'adjust') continue;
      const d = new Date(t.at);
      if (d < from || d > to) continue;
      if (t.amount > 0) inc += t.amount; else exp -= t.amount;
    }
    return { inc, exp };
  }

  function addWallet({ name, color, inTotal, initial }) {
    const w = { id: uid(), name, color, inTotal: !!inTotal, createdAt: new Date().toISOString() };
    store.wallets.push(w);
    if (initial) store.tx.push({ id: uid(), walletId: w.id, amount: initial, kind: 'adjust', memo: '初期残高', at: new Date().toISOString() });
    save();
    return w;
  }
  function removeWallet(id) {
    const transferIds = new Set(store.tx.filter((t) => t.walletId === id && t.transferId).map((t) => t.transferId));
    store.tx = store.tx.filter((t) => t.walletId !== id && !(t.transferId && transferIds.has(t.transferId)));
    store.wallets = store.wallets.filter((w) => w.id !== id);
    save();
  }
  function removeTx(id) {
    const t = store.tx.find((x) => x.id === id);
    if (!t) return;
    store.tx = store.tx.filter((x) => x.id !== id && !(t.transferId && x.transferId === t.transferId));
    save();
  }

  /* ---------- トースト ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 250);
    }, 1800);
  }

  /* ---------- スプリング（減衰比と応答時間で指定） ---------- */
  function spring(from, to, { response = 0.35, damping = 1, velocity = 0, onUpdate, onDone }) {
    if (reducedMotion.matches) { onUpdate(to); onDone && onDone(); return { cancel() {}, x: to, v: 0 }; }
    const omega = (2 * Math.PI) / response;
    const k = omega * omega, c = 2 * damping * omega;
    let x = from, v = velocity, last = performance.now(), raf;
    const handle = {
      cancel() { cancelAnimationFrame(raf); },
      get x() { return x; },
      get v() { return v; },
    };
    function step(now) {
      const dt = Math.min((now - last) / 1000, 0.064);
      last = now;
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) { const a = -k * (x - to) - c * v; v += a * h; x += v * h; }
      if (Math.abs(x - to) < 0.5 && Math.abs(v) < 8) { x = to; v = 0; onUpdate(x); onDone && onDone(); return; }
      onUpdate(x);
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return handle;
  }

  /* ---------- ボトムシート ---------- */
  const sheet = {
    root: $('#sheet-root'), el: $('#sheet'), body: $('#sheet-body'), scrim: $('#scrim'), grabber: $('#grabber'),
    open: false, y: 0, h: 0, anim: null, onClose: null,
  };

  function sheetSet(y) {
    sheet.y = y;
    sheet.el.style.transform = `translateY(${y}px)`;
    sheet.scrim.style.opacity = clamp(1 - y / sheet.h, 0, 1);
  }

  function openSheet(html, { onOpen, onClose } = {}) {
    if (sheet.open) { closeSheet(true); }
    // 中身ごと差し替えることで、前回のシートに付けたイベントリスナーを確実に捨てる
    sheet.body.innerHTML = '';
    const content = document.createElement('div');
    content.className = 'sheet-content';
    content.innerHTML = html;
    sheet.body.appendChild(content);
    sheet.body.scrollTop = 0;
    sheet.root.hidden = false;
    sheet.open = true;
    sheet.onClose = onClose || null;
    sheet.el.style.transition = 'none';
    sheet.h = sheet.el.offsetHeight;
    sheetSet(sheet.h);
    document.body.style.overflow = 'hidden';
    if (sheet.anim) sheet.anim.cancel();
    sheet.anim = spring(sheet.h, 0, { response: 0.38, damping: 1, onUpdate: sheetSet, onDone: () => { sheet.anim = null; } });
    onOpen && onOpen(content);
  }

  function closeSheet(immediate, velocity = 0) {
    if (!sheet.open) return;
    sheet.open = false;
    const finish = () => {
      sheet.root.hidden = true;
      sheet.body.innerHTML = '';
      sheet.anim = null;
      if (sheet.onClose) { const f = sheet.onClose; sheet.onClose = null; f(); }
    };
    if (sheet.anim) sheet.anim.cancel();
    if (immediate) { sheetSet(sheet.h); finish(); return; }
    sheet.anim = spring(sheet.y, sheet.h, { response: 0.32, damping: 1, velocity, onUpdate: sheetSet, onDone: finish });
  }

  // ドラッグで閉じる。指の位置に 1:1 で追従させ、離した速度を次のアニメーションへ引き継ぐ
  (() => {
    let dragging = false, startY = 0, startOffset = 0, hist = [];
    const rubber = (over, dim = 200, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
    const start = (e) => {
      if (!sheet.open) return;
      dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (sheet.anim) { sheet.anim.cancel(); sheet.anim = null; }
      startY = e.clientY; startOffset = sheet.y; hist = [[e.clientY, performance.now()]];
    };
    const move = (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      let y = startOffset + dy;
      if (y < 0) y = -rubber(-y);
      sheetSet(y);
      hist.push([e.clientY, performance.now()]);
      if (hist.length > 6) hist.shift();
    };
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      let v = 0;
      if (hist.length >= 2) {
        const [y0, t0] = hist[0], [y1, t1] = hist[hist.length - 1];
        if (t1 > t0) v = ((y1 - y0) / (t1 - t0)) * 1000;
      }
      const projected = sheet.y + (v / 1000) * 0.998 / (1 - 0.998);
      if (projected > sheet.h * 0.5 || v > 900) { sheet.open = true; closeSheet(false, Math.max(v, 0)); return; }
      sheet.anim = spring(sheet.y, 0, { response: 0.3, damping: 0.85, velocity: v, onUpdate: sheetSet, onDone: () => { sheet.anim = null; } });
    };
    for (const target of [sheet.grabber]) {
      target.addEventListener('pointerdown', start);
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', end);
      target.addEventListener('pointercancel', end);
    }
    sheet.body.addEventListener('pointerdown', (e) => {
      const head = e.target.closest('.sheet-head');
      if (!head || e.target.closest('button')) return;
      start({ currentTarget: sheet.body, pointerId: e.pointerId, clientY: e.clientY, setPointerCapture() {} });
      sheet.body.setPointerCapture(e.pointerId);
    });
    sheet.body.addEventListener('pointermove', move);
    sheet.body.addEventListener('pointerup', end);
    sheet.body.addEventListener('pointercancel', end);
    sheet.scrim.addEventListener('click', () => closeSheet());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.open) closeSheet(); });
  })();

  /* ---------- ルーター ---------- */
  const navStack = [];
  function currentRoute() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [name, ...rest] = hash.split('/');
    return { name: name || 'home', arg: rest.join('/') };
  }
  function go(hash) { location.hash = hash; }
  function back(fallback = '#/') {
    if (navStack.length > 1) history.back(); else go(fallback);
  }

  function render() {
    closeSheet(true);
    const r = currentRoute();
    const hash = location.hash || '#/';
    let dir = 'enter';
    if (navStack.length >= 2 && navStack[navStack.length - 2] === hash) { navStack.pop(); dir = 'enter-back'; }
    else if (navStack[navStack.length - 1] !== hash) navStack.push(hash);
    else dir = '';

    const screen = $('#screen');
    screen.scrollTop = 0;
    screen.className = 'screen';
    screen.onclick = null; $('#nav').onclick = null; $('#bottombar').onclick = null;
    const draw = SCREENS[r.name] || SCREENS.home;
    draw(r.arg);
    if (dir) { void screen.offsetWidth; screen.classList.add(dir); }
    $('#nav').classList.toggle('is-scrolled', false);
  }
  $('#screen').addEventListener('scroll', (e) => { $('#nav').classList.toggle('is-scrolled', e.target.scrollTop > 4); }, { passive: true });

  function setNav({ left = '', title = '', right = '' }) {
    $('#nav').innerHTML = `<div class="nav-inner"><div class="nav-left">${left}</div><div class="nav-title">${title}</div><div class="nav-right">${right}</div></div>`;
  }
  const backBtn = (label, fallback) => `<button class="nav-btn back" data-back="${esc(fallback || '#/')}">${I.back}<span>${esc(label)}</span></button>`;
  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-back]');
    if (b) back(b.dataset.back);
  });

  function tabbar(active) {
    const tabs = [
      ['home', '#/', I.walletTab, '財布'],
      ['transfer', '#/transfer', I.transferTab, '振替'],
      ['chart', '#/chart', I.chartTab, 'グラフ'],
      ['settings', '#/settings', I.settingsTab, '設定'],
    ];
    $('#bottombar').innerHTML = `<div class="tabbar">${tabs.map(([k, h, ic, l]) => `<a class="tab ${k === active ? 'active' : ''}" href="${h}" data-tab="${k}">${ic}<span>${l}</span></a>`).join('')}</div>`;
  }
  // タブ切替は履歴を積まない
  $('#bottombar').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-tab]');
    if (!a) return;
    e.preventDefault();
    navStack.length = 0;
    if (location.hash === a.getAttribute('href')) return;
    history.replaceState(null, '', a.getAttribute('href'));
    render();
  });

  const walletIcon = (w, cls = '') => `<span class="wallet-icon ${cls}" style="--wallet-color:${esc(w.color)}">${I.wallet}</span>`;

  /* ---------- 画面: 財布一覧 ---------- */
  const SCREENS = {};

  SCREENS.home = () => {
    setNav({ title: 'お小遣い帳', right: store.wallets.length ? '<a class="nav-btn" href="#/edit">編集</a>' : '' });
    tabbar('home');
    const now = new Date();
    const inIds = store.wallets.filter((w) => w.inTotal).map((w) => w.id);
    const st = monthStats(inIds, now.getFullYear(), now.getMonth());
    const rows = store.wallets.map((w) => `
      <a class="row has-icon pressable" href="#/wallet/${w.id}">
        ${walletIcon(w)}
        <div class="row-main"><div class="row-title">${esc(w.name)}${w.inTotal ? '' : '<span class="tag">合計外</span>'}</div></div>
        <div class="row-value">¥${yen(balance(w.id))}</div>
        ${I.chevron.replace('<svg', '<svg class="row-chevron"')}
      </a>`).join('');

    $('#screen').innerHTML = `
      <h1 class="large-title">財布</h1>
      <div class="hero">
        <div class="hero-label">合計残高</div>
        <div class="hero-amount"><span class="yen">¥</span>${yen(totalBalance())}</div>
        <div class="hero-sub"><span>${now.getMonth() + 1}月</span><span class="plus">+${yen(st.inc)}</span><span class="minus">−${yen(st.exp)}</span></div>
      </div>
      ${store.wallets.length ? `<div class="group">${rows}<button class="row tint" data-act="add-wallet">${I.plus.replace('<svg', '<svg style="width:20px;height:20px"')}<span>財布を追加</span></button></div>`
        : `<div class="group"><div class="empty"><strong>まだ財布がありません</strong>「財布の中身」「貯金箱」など、お金の置き場所ごとに財布を作ります。</div><button class="row tint" data-act="add-wallet">${I.plus.replace('<svg', '<svg style="width:20px;height:20px"')}<span>財布を追加</span></button></div>`}
      <div class="group-foot">「合計外」の財布は合計残高に含まれません。財布ごとの設定で切り替えられます。</div>
    `;
    $('#screen').onclick = (e) => { if (e.target.closest('[data-act="add-wallet"]')) walletForm(); };
  };

  /* ---------- 画面: 財布詳細 ---------- */
  SCREENS.wallet = (id) => {
    const w = walletById(id);
    if (!w) { go('#/'); return; }
    setNav({ left: backBtn('財布'), title: esc(w.name), right: `<button class="nav-btn" data-act="edit">編集</button>` });
    const bal = balance(w.id);
    const now = new Date();
    const st = monthStats([w.id], now.getFullYear(), now.getMonth());
    $('#bottombar').innerHTML = `
      <div class="actionbar">
        <button class="action action-balance" data-act="adjust"><span class="small">残高</span><span class="amt">¥${yen(bal)}</span></button>
        <button class="action action-in" data-act="in"><span class="lbl">${I.plus}入金</span></button>
        <button class="action action-out" data-act="out"><span class="lbl">${I.minus}出金</span></button>
      </div>`;

    const list = txOf(w.id).sort((a, b) => new Date(b.at) - new Date(a.at));
    let html = '';
    let lastDay = null;
    for (const t of list) {
      const k = dayKey(t.at);
      if (k !== lastDay) {
        if (lastDay !== null) html += '</div>';
        html += `<div class="tx-date">${fmtDateHeading(t.at)}</div><div class="group">`;
        lastDay = k;
      }
      html += txRow(t);
    }
    if (lastDay !== null) html += '</div>';

    $('#screen').innerHTML = `
      <div class="hero tinted" style="--wallet-color:${esc(w.color)}">
        <div class="hero-label">${esc(w.name)}の残高${w.inTotal ? '' : '<span class="tag">合計外</span>'}</div>
        <div class="hero-amount"><span class="yen">¥</span>${yen(bal)}</div>
        <div class="hero-sub"><span>${now.getMonth() + 1}月</span><span class="plus">+${yen(st.inc)}</span><span class="minus">−${yen(st.exp)}</span></div>
      </div>
      ${html || `<div class="group"><div class="empty"><strong>記録はまだありません</strong>下の「入金」「出金」から記録できます。</div></div>`}
    `;
    const handler = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'edit') walletForm(w);
      else if (act === 'in') txForm({ walletId: w.id, kind: 'in' });
      else if (act === 'out') txForm({ walletId: w.id, kind: 'out' });
      else if (act === 'adjust') adjustForm(w);
      else if (act === 'tx') txForm({ tx: store.tx.find((t) => t.id === b.dataset.id) });
    };
    $('#screen').onclick = handler;
    $('#bottombar').onclick = handler;
    $('#nav').onclick = handler;
  };

  function txRow(t) {
    const other = t.transferId ? store.tx.find((x) => x.transferId === t.transferId && x.id !== t.id) : null;
    const otherW = other && walletById(other.walletId);
    let title = t.memo || { in: '入金', out: '出金', transfer: '振替', adjust: '残高の調整' }[t.kind];
    let sub = fmtTime(t.at);
    if (t.kind === 'transfer' && otherW) sub += `　${t.amount < 0 ? `→ ${esc(otherW.name)}` : `← ${esc(otherW.name)}`}`;
    else if (t.kind === 'transfer') sub += '　振替';
    else if (t.kind === 'adjust' && t.memo) sub += '　残高の調整';
    const icon = t.kind === 'transfer' ? I.arrowRL : t.kind === 'adjust' ? I.adjust : t.amount >= 0 ? I.plus : I.minus;
    const cls = t.kind === 'transfer' ? 'transfer' : t.kind === 'adjust' ? 'adjust' : t.amount >= 0 ? 'in' : 'out';
    return `<button class="row tx-row has-icon" data-act="tx" data-id="${t.id}">
      <span class="tx-kind-icon ${cls}">${icon}</span>
      <div class="row-main"><div class="row-title">${esc(title)}</div><div class="row-sub">${sub}</div></div>
      <div class="row-value ${t.amount >= 0 ? 'plus' : 'minus'}">${yenSigned(t.amount)}</div>
    </button>`;
  }

  /* ---------- シート: 財布の追加・編集 ---------- */
  function walletForm(w) {
    const isNew = !w;
    const color = w ? w.color : PALETTE[store.wallets.length % PALETTE.length];
    openSheet(`
      <div class="sheet-head"><div class="sheet-title">${isNew ? '財布を追加' : '財布を編集'}</div><button class="nav-btn bold" data-act="save">${isNew ? '追加' : '保存'}</button></div>
      <div class="group">
        <div class="field"><label for="f-name">名前</label><input id="f-name" type="text" placeholder="財布の中身、貯金箱 など" value="${esc(w ? w.name : '')}" autocomplete="off" enterkeyhint="done"></div>
        ${isNew ? `<div class="field"><label for="f-init">今の残高</label><input id="f-init" type="number" inputmode="numeric" placeholder="0"><span class="unit">円</span></div>` : ''}
        <div class="field"><span class="field-label">合計に含める</span><label class="switch"><input id="f-total" type="checkbox" ${!w || w.inTotal ? 'checked' : ''}><span class="track"></span><span class="knob"></span></label></div>
      </div>
      <div class="group-title">色</div>
      <div class="group">
        <div class="swatches">
          ${PALETTE.map((c) => `<button class="swatch ${c === color ? 'selected' : ''}" style="--c:${c}" data-color="${c}" aria-label="${c}"></button>`).join('')}
          <div class="swatch custom" title="好きな色"><input type="color" id="f-custom" value="${esc(color)}"></div>
        </div>
      </div>
      ${isNew ? '' : `<button class="btn danger" data-act="delete">この財布を削除</button>`}
    `, {
      onOpen(body) {
        let picked = color;
        const mark = () => $$('.swatch', body).forEach((s) => s.classList.toggle('selected', s.dataset.color === picked));
        body.addEventListener('click', (e) => {
          const sw = e.target.closest('.swatch[data-color]');
          if (sw) { picked = sw.dataset.color; mark(); return; }
          const b = e.target.closest('[data-act]');
          if (!b) return;
          if (b.dataset.act === 'save') {
            const name = $('#f-name', body).value.trim();
            if (!name) { $('#f-name', body).focus(); toast('名前を入力してください'); return; }
            const inTotal = $('#f-total', body).checked;
            if (isNew) {
              const init = Math.round(Number($('#f-init', body).value) || 0);
              const nw = addWallet({ name, color: picked, inTotal, initial: init });
              closeSheet();
              toast(`「${nw.name}」を追加しました`);
              render();
            } else {
              Object.assign(w, { name, color: picked, inTotal });
              save(); closeSheet(); render();
            }
          } else if (b.dataset.act === 'delete') {
            const n = txOf(w.id).length;
            if (!confirm(`「${w.name}」を削除しますか？${n ? `\n${n}件の記録も消えます。` : ''}`)) return;
            removeWallet(w.id);
            closeSheet(true);
            toast('削除しました');
            go('#/');
          }
        });
        $('#f-custom', body).addEventListener('input', (e) => { picked = e.target.value; mark(); $('.swatch.custom', body).style.setProperty('--c', picked); $('.swatch.custom', body).classList.add('selected'); });
        if (isNew) setTimeout(() => $('#f-name', body).focus(), 250);
      },
    });
  }

  /* ---------- シート: 入金・出金・記録の編集 ---------- */
  function txForm({ walletId, kind, tx }) {
    const editing = !!tx;
    if (editing) { walletId = tx.walletId; kind = tx.kind === 'transfer' ? 'transfer' : tx.kind === 'adjust' ? 'adjust' : tx.amount >= 0 ? 'in' : 'out'; }
    const w = walletById(walletId);
    const canSwitch = !editing || kind === 'in' || kind === 'out';
    let curKind = kind === 'transfer' || kind === 'adjust' ? kind : kind;
    const title = editing ? '記録を編集' : kind === 'in' ? `${w.name}に入金` : `${w.name}から出金`;
    openSheet(`
      <div class="sheet-head"><div class="sheet-title">${esc(title)}</div><button class="nav-btn bold" data-act="save">${editing ? '保存' : '記録'}</button></div>
      ${canSwitch ? `<div class="segmented" id="f-kind"><button data-kind="in" class="${curKind === 'in' ? 'active' : ''}">入金</button><button data-kind="out" class="${curKind === 'out' ? 'active' : ''}">出金</button></div>` : ''}
      <div class="group">
        <div class="amount-field ${curKind}" id="f-amount-wrap"><input id="f-amount" type="number" inputmode="numeric" placeholder="0" value="${editing ? Math.abs(tx.amount) : ''}" enterkeyhint="done"><div class="hint">${curKind === 'transfer' ? '振替の金額（相手側にも反映されます）' : curKind === 'adjust' ? '調整額' : '円'}</div></div>
      </div>
      <div class="group">
        <div class="field"><label for="f-memo">メモ</label><input id="f-memo" type="text" placeholder="任意" value="${esc(editing ? tx.memo : '')}" autocomplete="off" enterkeyhint="done"></div>
        <div class="field"><label for="f-at">日時</label><input id="f-at" type="datetime-local" value="${toLocalInput(editing ? tx.at : new Date())}"></div>
      </div>
      ${editing ? `<button class="btn danger" data-act="delete">${tx.transferId ? 'この振替を削除' : 'この記録を削除'}</button>` : ''}
    `, {
      onOpen(body) {
        body.addEventListener('click', (e) => {
          const k = e.target.closest('[data-kind]');
          if (k) {
            curKind = k.dataset.kind;
            $$('#f-kind button', body).forEach((b) => b.classList.toggle('active', b === k));
            $('#f-amount-wrap', body).className = `amount-field ${curKind}`;
            return;
          }
          const b = e.target.closest('[data-act]');
          if (!b) return;
          if (b.dataset.act === 'delete') {
            if (!confirm('削除しますか？')) return;
            removeTx(tx.id); closeSheet(); toast('削除しました'); render();
            return;
          }
          const amt = Math.round(Math.abs(Number($('#f-amount', body).value)));
          if (!amt) { $('#f-amount', body).focus(); toast('金額を入力してください'); return; }
          const memo = $('#f-memo', body).value.trim();
          const atVal = $('#f-at', body).value;
          const at = atVal ? new Date(atVal).toISOString() : new Date().toISOString();
          if (editing) {
            if (tx.transferId) {
              for (const t of store.tx.filter((x) => x.transferId === tx.transferId)) { t.amount = Math.sign(t.amount) * amt; t.memo = memo; t.at = at; }
            } else if (tx.kind === 'adjust') {
              tx.amount = Math.sign(tx.amount) * amt; tx.memo = memo; tx.at = at;
            } else {
              tx.amount = curKind === 'in' ? amt : -amt; tx.kind = curKind; tx.memo = memo; tx.at = at;
            }
            save(); closeSheet(); toast('保存しました'); render();
          } else {
            store.tx.push({ id: uid(), walletId, amount: curKind === 'in' ? amt : -amt, kind: curKind, memo, at });
            save(); closeSheet(); toast(curKind === 'in' ? `¥${yen(amt)} 入金しました` : `¥${yen(amt)} 出金しました`); render();
          }
        });
        setTimeout(() => $('#f-amount', body).focus(), 250);
      },
    });
  }

  /* ---------- シート: 残高を合わせる ---------- */
  function adjustForm(w) {
    const bal = balance(w.id);
    openSheet(`
      <div class="sheet-head"><div class="sheet-title">残高を合わせる</div><button class="nav-btn bold" data-act="save">保存</button></div>
      <div class="group-foot" style="margin:0 0 12px">実際に数えた金額を入れると、差額が「残高の調整」として記録されます。記録上の残高は ¥${yen(bal)} です。</div>
      <div class="group">
        <div class="amount-field"><input id="f-actual" type="number" inputmode="numeric" placeholder="${yen(bal).replace(/,/g, '')}" enterkeyhint="done"><div class="hint" id="f-diff">実際の残高</div></div>
      </div>
      <div class="group">
        <div class="field"><label for="f-memo">メモ</label><input id="f-memo" type="text" placeholder="任意" autocomplete="off"></div>
        <div class="field"><label for="f-at">日時</label><input id="f-at" type="datetime-local" value="${toLocalInput(new Date())}"></div>
      </div>
    `, {
      onOpen(body) {
        const inp = $('#f-actual', body), diffEl = $('#f-diff', body);
        inp.addEventListener('input', () => {
          const v = inp.value === '' ? null : Math.round(Number(inp.value));
          diffEl.textContent = v === null ? '実際の残高' : `差額 ${yenSigned(v - bal)}`;
        });
        body.addEventListener('click', (e) => {
          if (!e.target.closest('[data-act="save"]')) return;
          if (inp.value === '') { inp.focus(); return; }
          const diff = Math.round(Number(inp.value)) - bal;
          if (diff === 0) { closeSheet(); toast('残高は合っています'); return; }
          const atVal = $('#f-at', body).value;
          store.tx.push({ id: uid(), walletId: w.id, amount: diff, kind: 'adjust', memo: $('#f-memo', body).value.trim(), at: atVal ? new Date(atVal).toISOString() : new Date().toISOString() });
          save(); closeSheet(); toast(`${yenSigned(diff)} 調整しました`); render();
        });
        setTimeout(() => inp.focus(), 250);
      },
    });
  }

  /* ---------- 画面: 振替 ---------- */
  SCREENS.transfer = () => {
    setNav({ title: '振替' });
    tabbar('transfer');
    const ws = store.wallets;
    if (ws.length < 2) {
      $('#screen').innerHTML = `<h1 class="large-title">振替</h1><div class="group"><div class="empty"><strong>財布が2つ以上必要です</strong>財布の一覧から追加してください。</div></div>`;
      return;
    }
    const last = store.settings.lastTransfer || {};
    let fromId = walletById(last.from) ? last.from : ws[0].id;
    let toId = walletById(last.to) && last.to !== fromId ? last.to : ws.find((w) => w.id !== fromId).id;
    const opts = (sel) => ws.map((w) => `<option value="${w.id}" ${w.id === sel ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
    $('#screen').innerHTML = `
      <h1 class="large-title">振替</h1>
      <div class="group-title">移動元</div>
      <div class="group">
        <div class="field">${walletIcon(walletById(fromId), 'sm')}<select id="t-from">${opts(fromId)}</select></div>
        <div class="field"><span class="field-label">残高</span><div class="row-value muted" id="t-from-bal" style="margin-left:auto"></div></div>
      </div>
      <div class="transfer-arrow"><button data-act="swap" aria-label="入れ替え">${I.swap}</button></div>
      <div class="group-title">移動先</div>
      <div class="group">
        <div class="field">${walletIcon(walletById(toId), 'sm')}<select id="t-to">${opts(toId)}</select></div>
        <div class="field"><span class="field-label">残高</span><div class="row-value muted" id="t-to-bal" style="margin-left:auto"></div></div>
      </div>
      <div class="group-title">金額</div>
      <div class="group">
        <div class="amount-field"><input id="t-amount" type="number" inputmode="numeric" placeholder="0" enterkeyhint="done"><div class="hint">円</div></div>
      </div>
      <div class="group">
        <div class="field"><label for="t-memo">メモ</label><input id="t-memo" type="text" placeholder="任意" autocomplete="off"></div>
        <div class="field"><label for="t-at">日時</label><input id="t-at" type="datetime-local" value="${toLocalInput(new Date())}"></div>
      </div>
      <button class="btn" id="t-go">振替する</button>
      <div class="group-foot" style="margin-top:12px">両方の財布に「振替」として記録されます。どちらかの記録を編集・削除すると、もう片方も一緒に変わります。</div>
    `;
    const s = $('#screen');
    const refresh = () => {
      fromId = $('#t-from', s).value; toId = $('#t-to', s).value;
      $('#t-from-bal', s).textContent = `¥${yen(balance(fromId))}`;
      $('#t-to-bal', s).textContent = `¥${yen(balance(toId))}`;
      $$('.wallet-icon', s)[0].style.setProperty('--wallet-color', walletById(fromId).color);
      $$('.wallet-icon', s)[1].style.setProperty('--wallet-color', walletById(toId).color);
      $('#t-go', s).disabled = fromId === toId;
    };
    refresh();
    $('#t-from', s).onchange = refresh; $('#t-to', s).onchange = refresh;
    s.onclick = (e) => {
      if (e.target.closest('[data-act="swap"]')) {
        const a = $('#t-from', s).value; $('#t-from', s).value = $('#t-to', s).value; $('#t-to', s).value = a; refresh(); return;
      }
      if (e.target.closest('#t-go')) {
        const amt = Math.round(Math.abs(Number($('#t-amount', s).value)));
        if (!amt) { $('#t-amount', s).focus(); toast('金額を入力してください'); return; }
        if (fromId === toId) { toast('同じ財布には振替できません'); return; }
        const memo = $('#t-memo', s).value.trim();
        const atVal = $('#t-at', s).value;
        const at = atVal ? new Date(atVal).toISOString() : new Date().toISOString();
        const transferId = uid();
        store.tx.push({ id: uid(), walletId: fromId, amount: -amt, kind: 'transfer', memo, at, transferId });
        store.tx.push({ id: uid(), walletId: toId, amount: amt, kind: 'transfer', memo, at, transferId });
        store.settings.lastTransfer = { from: fromId, to: toId };
        save();
        toast(`${walletById(fromId).name} → ${walletById(toId).name} に ¥${yen(amt)} 振替しました`);
        $('#t-amount', s).value = ''; $('#t-memo', s).value = '';
        refresh();
      }
    };
  };

  /* ---------- 画面: 残高推移グラフ ---------- */
  SCREENS.chart = () => {
    setNav({ title: '残高推移' });
    tabbar('chart');
    const set = store.settings.chart || (store.settings.chart = { range: 12, mode: 'total' });
    $('#screen').innerHTML = `
      <h1 class="large-title">残高推移</h1>
      <div class="segmented" id="c-range">${[[6, '6か月'], [12, '12か月'], [0, '全期間']].map(([v, l]) => `<button data-range="${v}" class="${set.range === v ? 'active' : ''}">${l}</button>`).join('')}</div>
      <div class="segmented" id="c-mode"><button data-mode="total" class="${set.mode === 'total' ? 'active' : ''}">合計</button><button data-mode="each" class="${set.mode === 'each' ? 'active' : ''}">財布ごと</button></div>
      <div class="chart-wrap">
        <div class="chart-head"><span class="lab" id="c-lab"></span><span class="val" id="c-val"></span></div>
        <canvas id="c-canvas"></canvas>
        <div class="legend" id="c-legend"></div>
      </div>
      <div id="c-table"></div>
    `;
    const s = $('#screen');
    let chart = null;
    const build = () => { chart = drawChart($('#c-canvas', s), set, $('#c-lab', s), $('#c-val', s), $('#c-legend', s), $('#c-table', s)); };
    build();
    s.onclick = (e) => {
      const r = e.target.closest('[data-range]'), m = e.target.closest('[data-mode]');
      if (r) { set.range = Number(r.dataset.range); $$('#c-range button', s).forEach((b) => b.classList.toggle('active', b === r)); save(); build(); }
      if (m) { set.mode = m.dataset.mode; $$('#c-mode button', s).forEach((b) => b.classList.toggle('active', b === m)); save(); build(); }
    };
    window.addEventListener('resize', () => { if (currentRoute().name === 'chart') build(); }, { once: true });
  };

  function chartMonths(range) {
    const now = new Date();
    let start;
    if (range > 0) start = new Date(now.getFullYear(), now.getMonth() - (range - 1), 1);
    else {
      const first = store.tx.reduce((m, t) => Math.min(m, new Date(t.at).getTime()), Infinity);
      const f = isFinite(first) ? new Date(first) : now;
      start = new Date(f.getFullYear(), f.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      if (start > lastMonthStart) start = lastMonthStart;
    }
    const months = [];
    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) months.push({ y: d.getFullYear(), m: d.getMonth() });
    return months;
  }

  function shortYen(n) {
    const a = Math.abs(n), sign = n < 0 ? '−' : '';
    if (a >= 100000000) return `${sign}${(a / 100000000).toFixed(a % 100000000 ? 1 : 0)}億`;
    if (a >= 10000) return `${sign}${(a / 10000).toFixed(a % 10000 ? 1 : 0)}万`;
    return `${sign}${a.toLocaleString('ja-JP')}`;
  }

  function drawChart(canvas, set, labEl, valEl, legendEl, tableEl) {
    const months = chartMonths(set.range);
    const series = set.mode === 'total'
      ? [{ name: '合計', color: getComputedStyle(document.documentElement).getPropertyValue('--tint').trim() || '#007aff', fill: true, values: months.map(({ y, m }) => totalBalance(monthEnd(y, m))) }]
      : store.wallets.map((w) => ({ name: w.name, color: w.color, values: months.map(({ y, m }) => balance(w.id, monthEnd(y, m))) }));
    const showLegend = (i) => { legendEl.innerHTML = set.mode === 'each' ? series.map((sr) => `<span><i style="--c:${esc(sr.color)}"></i>${esc(sr.name)} <b>¥${yen(sr.values[i])}</b></span>`).join('') : ''; };

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const colLabel2 = css.getPropertyValue('--label-2').trim(), colSep = css.getPropertyValue('--sep').trim();

    const all = series.flatMap((s) => s.values);
    let min = Math.min(0, ...all), max = Math.max(...all, 0);
    if (max === min) max = min + 1000;
    const span = max - min;
    max += span * 0.08; if (min < 0) min -= span * 0.08;
    const P = { l: 48, r: 14, t: 10, b: 26 };
    const cw = W - P.l - P.r, ch = H - P.t - P.b;
    const X = (i) => P.l + (months.length === 1 ? cw / 2 : (cw * i) / (months.length - 1));
    const Y = (v) => P.t + ch - ((v - min) / (max - min)) * ch;

    let selected = months.length - 1;
    const labelFor = (i) => `${months[i].y}年${months[i].m + 1}月末`;
    const showHead = () => {
      labEl.textContent = labelFor(selected);
      if (set.mode === 'total') valEl.textContent = `¥${yen(series[0].values[selected])}`;
      else valEl.textContent = `合計 ¥${yen(totalBalance(monthEnd(months[selected].y, months[selected].m)))}`;
      showLegend(selected);
    };

    const paint = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = colLabel2; ctx.strokeStyle = colSep; ctx.lineWidth = 1;
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const v = min + ((max - min) * i) / ticks, y = Y(v);
        ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(W - P.r, y); ctx.stroke();
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(shortYen(Math.round(v)), P.l - 6, y);
      }
      if (min < 0) { const y0 = Y(0); ctx.strokeStyle = colLabel2; ctx.beginPath(); ctx.moveTo(P.l, y0); ctx.lineTo(W - P.r, y0); ctx.stroke(); }
      // 月ラベル
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const every = Math.max(1, Math.ceil(months.length / Math.floor(cw / 34)));
      months.forEach(({ y, m }, i) => {
        if ((months.length - 1 - i) % every !== 0) return;
        const lab = m === 0 ? `${y}年` : `${m + 1}月`;
        ctx.fillStyle = colLabel2; ctx.fillText(lab, X(i), P.t + ch + 6);
      });
      // 選択位置の縦線
      if (months.length > 1) {
        ctx.strokeStyle = colLabel2; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(X(selected), P.t); ctx.lineTo(X(selected), P.t + ch); ctx.stroke(); ctx.setLineDash([]);
      }
      for (const sr of series) {
        if (sr.fill) {
          const g = ctx.createLinearGradient(0, P.t, 0, P.t + ch);
          g.addColorStop(0, sr.color + '55'); g.addColorStop(1, sr.color + '00');
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(X(0), Y(Math.max(min, 0)));
          sr.values.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
          ctx.lineTo(X(months.length - 1), Y(Math.max(min, 0))); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = sr.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); sr.values.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
        ctx.fillStyle = sr.color; ctx.beginPath(); ctx.arc(X(selected), Y(sr.values[selected]), 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = css.getPropertyValue('--bg-elevated').trim(); ctx.beginPath(); ctx.arc(X(selected), Y(sr.values[selected]), 2, 0, Math.PI * 2); ctx.fill();
      }
    };
    showHead(); paint();

    const pick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let best = 0, bd = Infinity;
      months.forEach((_, i) => { const d = Math.abs(X(i) - x); if (d < bd) { bd = d; best = i; } });
      if (best !== selected) { selected = best; showHead(); paint(); }
    };
    let down = false;
    canvas.onpointerdown = (e) => { down = true; canvas.setPointerCapture(e.pointerId); pick(e); };
    canvas.onpointermove = (e) => { if (down) pick(e); };
    canvas.onpointerup = canvas.onpointercancel = () => { down = false; };

    // 月ごとの表（合計）
    const totals = months.map(({ y, m }) => totalBalance(monthEnd(y, m)));
    const inIds = store.wallets.filter((w) => w.inTotal).map((w) => w.id);
    tableEl.innerHTML = `<div class="group-title">月ごとの合計残高</div><div class="group">${months.map(({ y, m }, i) => {
      const st = monthStats(inIds, y, m);
      const diff = i ? totals[i] - totals[i - 1] : null;
      return `<div class="row"><div class="row-main"><div class="row-title">${y}年${m + 1}月</div><div class="row-sub"><span style="color:var(--green)">+${yen(st.inc)}</span>　<span style="color:var(--red)">−${yen(st.exp)}</span></div></div><div style="text-align:right"><div class="row-value">¥${yen(totals[i])}</div>${diff === null ? '' : `<div class="row-sub" style="color:${diff >= 0 ? 'var(--green)' : 'var(--red)'}">${yenSigned(diff)}</div>`}</div></div>`;
    }).reverse().join('')}</div>`;
    return { paint };
  }

  /* ---------- 画面: 財布の編集（並び替え・削除） ---------- */
  SCREENS.edit = () => {
    setNav({ left: backBtn('財布'), title: '財布の編集', right: `<button class="nav-btn bold" data-back="#/">完了</button>` });
    $('#bottombar').innerHTML = '';
    const rows = store.wallets.map((w) => `
      <div class="edit-row" data-id="${w.id}">
        <button class="del" data-act="delete" aria-label="削除">${I.minus}</button>
        <button class="info" data-act="edit">${walletIcon(w)}<div class="row-main"><div class="row-title">${esc(w.name)}</div><div class="row-sub">${w.inTotal ? '合計に含める' : '合計外'}　¥${yen(balance(w.id))}</div></div></button>
        <span class="handle" aria-label="並び替え">${I.handle}</span>
      </div>`).join('');
    $('#screen').innerHTML = `
      <div class="group" id="edit-list">${rows}</div>
      <div class="group"><button class="row tint" data-act="add">${I.plus.replace('<svg', '<svg style="width:20px;height:20px"')}<span>財布を追加</span></button></div>
      <div class="group-foot">右端の ≡ を上下にドラッグすると並び替えできます。名前をタップすると色や設定を変えられます。</div>
    `;
    const s = $('#screen');
    s.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const row = b.closest('.edit-row');
      const w = row && walletById(row.dataset.id);
      if (b.dataset.act === 'add') walletForm();
      else if (b.dataset.act === 'edit') walletForm(w);
      else if (b.dataset.act === 'delete') {
        const n = txOf(w.id).length;
        if (!confirm(`「${w.name}」を削除しますか？${n ? `\n${n}件の記録も消えます。` : ''}`)) return;
        removeWallet(w.id); toast('削除しました'); render();
      }
    };
    enableReorder($('#edit-list', s), (ids) => {
      store.wallets.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      save();
    });
  };

  function enableReorder(list, onReorder) {
    list.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest('.handle');
      if (!handle) return;
      const row = handle.closest('.edit-row');
      const rows = $$('.edit-row', list);
      const idx = rows.indexOf(row);
      const rects = rows.map((r) => r.getBoundingClientRect());
      const rowH = rects[idx].height;
      const startY = e.clientY;
      let target = idx;
      handle.setPointerCapture(e.pointerId);
      row.classList.add('dragging');
      rows.forEach((r) => { if (r !== row) r.style.transition = reducedMotion.matches ? 'none' : 'transform 160ms ease'; });
      e.preventDefault();

      const move = (ev) => {
        const dy = ev.clientY - startY;
        row.style.transform = `translateY(${dy}px) scale(1.02)`;
        const center = rects[idx].top + rowH / 2 + dy;
        target = idx;
        rows.forEach((r, i) => {
          if (r === row) return;
          const c = rects[i].top + rects[i].height / 2;
          if (i < idx && center < c) { r.style.transform = `translateY(${rowH}px)`; target = Math.min(target, i); }
          else if (i > idx && center > c) { r.style.transform = `translateY(${-rowH}px)`; target = Math.max(target, i); }
          else r.style.transform = '';
        });
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        row.classList.remove('dragging');
        rows.forEach((r) => { r.style.transform = ''; r.style.transition = ''; });
        if (target !== idx) {
          const ref = target > idx ? rows[target].nextSibling : rows[target];
          list.insertBefore(row, ref);
          onReorder($$('.edit-row', list).map((r) => r.dataset.id));
        }
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  /* ---------- 画面: 設定 ---------- */
  SCREENS.settings = () => {
    setNav({ title: '設定' });
    tabbar('settings');
    const txCount = store.tx.length;
    $('#screen').innerHTML = `
      <h1 class="large-title">設定</h1>
      <div class="group-title">財布</div>
      <div class="group">
        <a class="row pressable" href="#/edit"><div class="row-main"><div class="row-title">財布の編集・並び替え</div></div>${I.chevron.replace('<svg', '<svg class="row-chevron"')}</a>
      </div>
      <div class="group-title">バックアップ</div>
      <div class="group">
        <button class="row" data-act="export"><div class="row-main"><div class="row-title">バックアップを書き出す</div><div class="row-sub">財布 ${store.wallets.length} 件・記録 ${txCount} 件を JSON で保存</div></div></button>
        <button class="row" data-act="import"><div class="row-main"><div class="row-title">バックアップを読み込む</div><div class="row-sub">今のデータはすべて置き換わります</div></div></button>
        <input type="file" id="s-file" accept="application/json,.json" hidden>
      </div>
      <div class="group-foot">データはこの端末（ブラウザ）の中だけに保存されます。機種変更やブラウザのデータ削除に備えて、ときどき書き出しておくと安心です。</div>
      <div class="group-title">データ</div>
      <div class="group">
        <button class="row danger" data-act="reset">すべてのデータを削除</button>
      </div>
      <div class="about">お小遣い帳 v1.0<br>ホーム画面に追加するとアプリのように使えます。</div>
    `;
    const s = $('#screen');
    s.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'export') {
        const blob = new Blob([JSON.stringify({ version: 1, wallets: store.wallets, tx: store.tx, settings: store.settings, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const d = new Date();
        a.href = URL.createObjectURL(blob);
        a.download = `okozukai-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } else if (act === 'import') {
        $('#s-file', s).click();
      } else if (act === 'reset') {
        if (!confirm('すべての財布と記録を削除します。よろしいですか？')) return;
        if (!confirm('本当に削除しますか？元に戻せません。')) return;
        store.wallets = []; store.tx = []; store.settings = {};
        save(); toast('削除しました'); render();
      }
    };
    $('#s-file', s).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!Array.isArray(data.wallets) || !Array.isArray(data.tx)) throw new Error('形式が違います');
        if (!confirm(`財布 ${data.wallets.length} 件・記録 ${data.tx.length} 件を読み込み、今のデータと置き換えます。よろしいですか？`)) return;
        store.wallets = data.wallets; store.tx = data.tx; store.settings = data.settings || {};
        save(); toast('読み込みました'); render();
      } catch (err) {
        toast('読み込めませんでした: ' + err.message);
      }
      e.target.value = '';
    };
  };

  /* ---------- 起動 ---------- */
  load();
  window.addEventListener('hashchange', render);
  if (!location.hash) history.replaceState(null, '', '#/');
  render();

  // 別タブでの変更を反映
  window.addEventListener('storage', (e) => { if (e.key === KEY) { load(); render(); } });
})();
