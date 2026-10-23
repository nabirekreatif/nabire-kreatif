/* Nabire Kreatif — inti aplikasi: router hash, cache SWR, klien API, UI helper.
   Prinsip "instan": halaman selalu dirender SINKRON dari cache; jaringan hanya memperbarui di belakang layar. */
(function (w) {
  'use strict';
  const CFG = w.NK_CONFIG || {};
  const SV = 1;                       // versi skema cache — naikkan bila bentuk data berubah
  const WRITES = new Set(['auth.register', 'auth.google', 'request.create', 'order.create', 'code.redeem', 'order.approve', 'order.reject', 'content.save', 'content.delete', 'code.generate', 'code.void', 'member.status', 'request.status', 'settings.save', 'backup.run', 'system.repair', 'system.dummyReset', 'system.dummyClear', 'notif.configSave', 'notif.retry', 'wa.blastCreate', 'wa.blastStop', 'crm.sync', 'crm.save', 'crm.bulk', 'crm.interaksi', 'crm.import', 'migrasi.run', 'csv.import', 'bio.save', 'bio.admin', 'license.release', 'license.admin', 'license.key']);

  /* ---------------- util ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const rp = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const num = v => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
  const TZ = 'Asia/Jayapura';
  const fD = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
  const fT = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  const vd = v => { const d = new Date(v); return isNaN(d) || !v ? null : d; };
  const dt = v => { const d = vd(v); return d ? fD.format(d) : '-'; };
  const tm = v => { const d = vd(v); return d ? fT.format(d).replace('.', ':') : ''; };
  const dtm = v => { const d = vd(v); return d ? fD.format(d) + ' · ' + fT.format(d).replace('.', ':') + ' WIT' : '-'; };
  const ago = v => { const d = vd(v); if (!d) return '-'; const s = (Date.now() - d) / 1000; if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' mnt lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'; if (s < 864000) return Math.floor(s / 86400) + ' hari lalu'; return dt(v); };
  const hash = o => { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h + ':' + s.length; };
  const uid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  const debounce = (fn, ms) => { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; };
  const idle = fn => (w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
  const safeUrl = u => { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; };
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const num62 = v => { let d = String(v || '').replace(/\D/g, ''); if (d.indexOf('0') === 0) d = '62' + d.slice(1); else if (d.indexOf('8') === 0) d = '62' + d; return d; };
  const waLink = (n, text) => 'https://wa.me/' + num62(n) + (text ? '?text=' + encodeURIComponent(text) : '');
  function ytEmbed(u) {
    u = String(u || ''); let id = '';
    let m = u.match(/youtu\.be\/([\w-]{6,})/) || u.match(/[?&]v=([\w-]{6,})/) || u.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]{6,})/);
    if (m) id = m[1]; else if (/^[\w-]{11}$/.test(u)) id = u;
    return id ? 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1' : '';
  }
  function driveId(u) { const m = String(u || '').match(/\/d\/([\w-]{15,})/) || String(u || '').match(/[?&]id=([\w-]{15,})/); return m ? m[1] : ''; }
  function pdfEmbed(u) { u = safeUrl(u); if (!u) return ''; const id = driveId(u); if (id && /google\.com/.test(u)) return 'https://drive.google.com/file/d/' + id + '/preview'; if (/\.pdf(\?|#|$)/i.test(u)) return 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(u); return ''; }
  function dlUrl(u) { u = safeUrl(u); const id = driveId(u); if (id && /drive\.google\.com/.test(u) && /\/file\/d\//.test(u)) return 'https://drive.google.com/uc?export=download&id=' + id; return u; }
  function copy(text, msg) {
    const done = () => toast(msg || 'Disalin ✓', 'ok');
    if (navigator.clipboard && w.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fb()); else fb();
    function fb() { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Gagal menyalin', 'err'); } t.remove(); }
  }
  function download(name, text, mime) { const b = new Blob([text], { type: mime || 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false; text = String(text).replace(/^﻿/, '');
    const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    return rows.filter(r => r.some(x => String(x).trim())).map(r => { const o = {}; head.forEach((h, i) => { o[h] = (r[i] || '').trim(); }); return o; });
  }

  /* ---------------- ikon (SVG inline, tanpa CDN) ---------------- */
  const ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor"/>', facebook: '<path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>', youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>', tiktok: '<path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.3 2.7 2.2 4.7 5 5"/>', whatsapp: '<path d="M3 21l1.6-4.8A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1z"/><path d="M9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z"/>', camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>', arrowup: '<path d="M12 19V5M5 12l7-7 7 7"/>', arrowdown: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>', cap: '<path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5"/>',
    cloud: '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18z"/>', receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    logout: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>', bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>', check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', refresh: '<path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', play: '<path d="M8 5v14l11-7z" fill="currentColor"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5 7-5s7 1.5 7 5M16 4.5a3.5 3.5 0 010 7M18 15c2.5.5 4 2 4 5"/>',
    chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>', chart: '<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-8"/>', db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', wallet: '<path d="M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2z"/><circle cx="16" cy="14.5" r="1" fill="currentColor"/>', box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h0"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    mega: '<path d="M3 11v3a1 1 0 001 1h2l4 4V7L6 10H4a1 1 0 00-1 1zM15 8a5 5 0 010 8M18 5a9 9 0 010 14"/>', contact: '<path d="M5 3h13a1 1 0 011 1v16a1 1 0 01-1 1H5zM3 7h3M3 12h3M3 17h3"/><circle cx="13" cy="10" r="2.5"/><path d="M8.5 17c.5-2 2.2-3 4.5-3s4 1 4.5 3"/>',
    file: '<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8"/>', code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>', pin: '<path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h0"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', hist: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5M3 4v4h4M12 8v4l3 2"/>', filter: '<path d="M3 5h18l-7 9v6l-4-2v-4z"/>', more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.9.7 1.5 1.6 1.5 2.6V17h4v-.5c0-1 .6-1.9 1.5-2.6A6 6 0 0012 3z"/>', trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6"/>',
    qr: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v0M14 20h3M20 17v4"/>', toggle: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>', video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="M16 10l6-3v10l-6-3z"/>', phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>'
  };
  const ic = (n, c) => '<svg class="ic ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  /* ---------------- performa ---------------- */
  const Perf = { log: [], add(a, ms, srv, hit) { this.log.push({ aksi: a, klien_ms: Math.round(ms), server_ms: srv == null ? '-' : srv, cache: hit || '' }); if (this.log.length > 120) this.log.shift(); }, table() { console.table(this.log.slice(-40)); }, render: [] };
  w.Perf = Perf;

  /* ---------------- state & session ---------------- */
  const S = { session: null, route: null, layout: '', deps: new Set(), gas: !!CFG.GAS_URL, pendingSoft: false };
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
  function loadSession() { try { const j = JSON.parse(LS.get('nk.sess') || 'null'); if (j && j.token && j.email) S.session = j; } catch (e) { } }
  function saveSession(s) { S.session = s; if (s) LS.set('nk.sess', JSON.stringify(s)); else LS.del('nk.sess'); }

  /* ---------------- Store (memori + localStorage ber-namespace per pengguna) ---------------- */
  const mem = {}, dirty = new Set();
  const skey = (scope, k) => 'nk' + SV + ':' + (scope === 'u' ? (S.session ? S.session.email : '_') : 'pub') + ':' + k;
  function sget(scope, k) { const key = skey(scope, k); let e = mem[key]; if (e === undefined) { let j = null; try { j = JSON.parse(LS.get(key) || 'null'); } catch (x) { } e = mem[key] = j; } return e; }
  const flush = debounce(() => idle(() => { dirty.forEach(key => { try { localStorage.setItem(key, JSON.stringify(mem[key])); } catch (e) { pruneStore(); } }); dirty.clear(); }), 400);
  function sset(scope, k, v) { const key = skey(scope, k), e = { t: Date.now(), h: hash(v), v: v }; mem[key] = e; dirty.add(key); flush(); return e; }
  function stale(scope, k) { const e = sget(scope, k); if (e) { e.t = 0; dirty.add(skey(scope, k)); } }
  function pruneStore() { try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^nk\d+:/.test(k) && k.indexOf('nk' + SV + ':pub:') !== 0) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); } catch (e) { } }
  function purgeOld() { try { const del = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^nk\d+:/.test(k) && k.indexOf('nk' + SV + ':') !== 0) del.push(k); } del.forEach(k => localStorage.removeItem(k)); } catch (e) { } }
  function clearUser(email) { try { const pre = 'nk' + SV + ':' + email + ':', del = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf(pre) === 0) del.push(k); } del.forEach(k => localStorage.removeItem(k)); Object.keys(mem).forEach(k => { if (k.indexOf(pre) === 0) delete mem[k]; }); } catch (e) { } }

  /* ---------------- API ---------------- */
  let inflightN = 0, netT = 0;
  function netBar(on) { const el = $('#net'); if (!el) return; clearTimeout(netT); if (on) { netT = setTimeout(() => { el.classList.add('on'); el.style.width = '70%'; }, 250); } else { el.style.width = '100%'; setTimeout(() => { el.classList.remove('on'); el.style.width = '0'; }, 220); } }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  async function api(action, data, opt) {
    opt = opt || {};
    if (!CFG.GAS_URL) return { success: false, message: 'Backend belum disambungkan. Isi GAS_URL di js/config.js.', code: 'NOGAS' };
    const isW = WRITES.has(action), reqId = isW ? uid() : undefined, t0 = performance.now();
    const body = JSON.stringify({ action: action, data: data || {}, token: S.session ? S.session.token : '', reqId: reqId, appUrl: location.origin + location.pathname });
    const tries = opt.tries || 3, timeout = opt.timeout || (isW ? 45000 : 25000);
    let last = null;
    if (!opt.quiet) { inflightN++; netBar(true); }
    try {
      for (let i = 0; i < tries; i++) {
        const ctl = new AbortController(), tid = setTimeout(() => ctl.abort(), timeout);
        try {
          const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow', signal: ctl.signal });
          clearTimeout(tid);
          const j = await r.json();
          Perf.add(action, performance.now() - t0, j.ms);
          if (!j.success && j.data && j.data.code === 'AUTH' && S.session) { forceLogout('Sesi berakhir. Silakan masuk lagi.'); }
          if (!j.success && j.data && j.data.code === 'FORBIDDEN' && S.session && S.session.role === 'superadmin') { /* abaikan */ }
          return j;
        } catch (e) { clearTimeout(tid); last = e; if (i < tries - 1) await sleep(500 * Math.pow(2, i)); }
      }
      return { success: false, message: navigator.onLine === false ? 'Anda sedang offline.' : 'Koneksi lambat atau server tidak merespons. Coba lagi.', code: 'NET' };
    } finally { if (!opt.quiet) { inflightN--; if (!inflightN) netBar(false); } }
  }

  /* ---------------- sumber data (kunci cache → panggilan API) ---------------- */
  function srcOf(key) {
    const S_ = { pub: ['publicBootstrap', {}], boot: ['memberBootstrap', {}], adm: ['adminBootstrap', {}], orders: ['orders.list', {}], members: ['members.list', {}], reqs: ['requests.list', {}], codes: ['code.list', {}], settings: ['settings.get', {}], backups: ['backup.list', {}], sys: ['system.status', {}], logs: ['logs.list', {}], crmstats: ['crm.stats', {}], 'notif.config': ['notif.config', {}], blasts: ['wa.blastList', {}] };
    if (S_[key]) return S_[key];
    if (key === 'lic.adm') return ['license.list', {}]; if (key === 'bio.me') return ['bio.get', {}]; if (key === 'bio.adm') return ['bio.list', {}];
    if (key.indexOf('bio:') === 0) return ['bio.public', { slug: key.slice(4) }];
    if (key.indexOf('c:') === 0) return ['content.list', { sheet: key.slice(2) }];
    if (key.indexOf('orders:') === 0) return ['orders.list', { status: key.slice(7) }];
    if (key.indexOf('stats:') === 0) return ['stats.get', { days: +key.slice(6) }];
    if (key.indexOf('crm:') === 0) return ['crm.list', JSON.parse(key.slice(4))];
    if (key.indexOf('queue:') === 0) return ['notif.queue', JSON.parse(key.slice(6))];
    return null;
  }
  const inflight = {};
  function revalidate(scope, key, opt) {
    const id = scope + key; if (inflight[id]) return inflight[id];
    const src = srcOf(key); if (!src) return Promise.resolve();
    return inflight[id] = api(src[0], src[1], { quiet: true }).then(r => {
      delete inflight[id];
      if (!r.success) { if (opt && opt.onFail) opt.onFail(r); return r; }
      const old = sget(scope, key);
      if (old && old.h === hash(r.data)) { old.t = Date.now(); return r; }   // tidak berubah → tidak render ulang
      sset(scope, key, r.data); emit(scope + key); return r;
    }).catch(() => { delete inflight[id]; });
  }
  /** Ambil data: kembalikan cache SEKETIKA (atau undefined), lalu segarkan di belakang layar bila basi. */
  function use(key, opt) {
    opt = opt || {}; const scope = opt.scope || 'u', ttl = opt.ttl == null ? 45000 : opt.ttl;
    S.deps.add(scope + key);
    const e = sget(scope, key);
    if (!e || opt.force || Date.now() - e.t > ttl) { if (S.gas && (scope === 'pub' || S.session)) revalidate(scope, key, opt); }
    return e ? e.v : undefined;
  }
  const dataHooks = [];
  function onData(fn) { dataHooks.push(fn); }
  function emit(id) { dataHooks.forEach(f => { try { f(id); } catch (e) { } }); if (S.deps.has(id)) softRender(); chromeUpdate(); }
  const hasEntry = (scope, key) => !!sget(scope, key);
  /** Mutasi optimistis lokal + rollback bila server menolak. */
  async function optimistic(scope, key, apply, call, onOk) {
    const e = sget(scope, key), snap = e ? clone(e.v) : undefined;
    if (e) { apply(e.v); e.h = hash(e.v); dirty.add(skey(scope, key)); flush(); emit(scope + key); }
    const r = await call();
    if (!r.success) { if (e && snap !== undefined) { e.v = snap; e.h = hash(snap); emit(scope + key); } toast(r.message || 'Gagal menyimpan', 'err'); }
    else if (onOk) onOk(r);
    return r;
  }
  function patchData(scope, key, fn) { const e = sget(scope, key); if (!e) return; fn(e.v); e.h = hash(e.v); dirty.add(skey(scope, key)); flush(); emit(scope + key); }
  function refreshDeps() { S.deps.forEach(id => { const scope = id.slice(0, id.indexOf('pub') === 0 ? 3 : 1); const key = id.slice(scope.length); stale(scope === 'u' ? 'u' : 'pub', key); revalidate(scope === 'u' ? 'u' : 'pub', key); }); }
  /** Prefetch idle: satu panggilan `batch` mengisi banyak cache sekaligus. */
  function prefetch(keys) {
    if (!S.session || !S.gas) return;
    const need = keys.filter(k => { const e = sget('u', k); return !e || Date.now() - e.t > 60000; });
    if (!need.length) return;
    for (let i = 0; i < need.length; i += 8) {
      const part = need.slice(i, i + 8);
      idle(() => api('batch', { calls: part.map(k => { const s = srcOf(k); return { key: k, action: s[0], data: s[1] }; }) }, { quiet: true, tries: 1 }).then(r => {
        if (!r.success) return;
        part.forEach(k => { const x = r.data[k]; if (x && x.success) { const old = sget('u', k); if (!old || old.h !== hash(x.data)) { sset('u', k, x.data); emit('u' + k); } else old.t = Date.now(); } });
      }));
    }
  }

  /* ---------------- toast & modal ---------------- */
  function toast(msg, type, ms) {
    const root = $('#toasts'); if (!root) return;
    const el = document.createElement('div'); el.className = 'toast ' + (type || ''); el.innerHTML = (type === 'err' ? ic('alert', 'sm') : type === 'ok' ? ic('check', 'sm') : ic('info', 'sm')) + '<span>' + esc(msg) + '</span>';
    root.appendChild(el); while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => el.remove(), ms || (type === 'err' ? 5000 : 2800));
  }
  let modalOnClose = null;
  function modal(o) {
    closeModal(true);
    const root = $('#modal-root');
    root.innerHTML = '<div class="scrim" data-act="scrim"><div class="sheet ' + (o.cls || '') + '" role="dialog" aria-modal="true"><div class="sheet-h"><h3>' + esc(o.title || '') + '</h3><button class="x" data-act="modal-close" aria-label="Tutup">' + ic('x') + '</button></div><div class="sheet-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="sheet-f">' + o.foot + '</div>' : '') + '</div></div>';
    document.body.style.overflow = 'hidden'; modalOnClose = o.onClose || null;
    const f = $('input:not([type=hidden]),textarea,select', root); if (f && !o.noFocus) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { } }, 30);
    return root;
  }
  function closeModal(silent) { const root = $('#modal-root'); if (!root || !root.firstChild) return; root.innerHTML = ''; document.body.style.overflow = ''; const cb = modalOnClose; modalOnClose = null; if (!silent && cb) cb(); if (S.pendingSoft) softRender(); }
  const modalOpen = () => { const r = $('#modal-root'); return !!(r && r.firstChild); };
  function confirmBox(msg, opt) {
    opt = opt || {};
    return new Promise(res => {
      modal({ title: opt.title || 'Konfirmasi', cls: '', body: '<p>' + msg + '</p>', foot: '<button class="btn ghost" data-act="cf-no">Batal</button><button class="btn ' + (opt.danger ? 'danger' : 'pri') + '" data-act="cf-yes">' + esc(opt.ok || 'Ya, lanjutkan') + '</button>', noFocus: true, onClose: () => res(false) });
      CONFIRM.yes = () => { modalOnClose = null; closeModal(true); res(true); }; CONFIRM.no = () => closeModal();
    });
  }
  const CONFIRM = {};
  function busy(btn, on) { if (!btn) return; btn.classList.toggle('busy', !!on); if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy'); }

  /* ---------------- aksi & form (event delegation — aman terhadap render ulang) ---------------- */
  const ACT = {}, FORM = {}, INPUT = {};
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.getAttribute('data-act');
    if (a === 'scrim') { if (e.target === el) closeModal(); return; }
    if (a === 'modal-close') return closeModal();
    if (a === 'cf-yes') return CONFIRM.yes && CONFIRM.yes();
    if (a === 'cf-no') return CONFIRM.no && CONFIRM.no();
    if (ACT[a]) { if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault(); ACT[a](el, e); }
  });
  document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); const n = f.getAttribute('data-form'); if (FORM[n]) FORM[n](f, e); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUT[el.getAttribute('data-input')]) INPUT[el.getAttribute('data-input')](el, e); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && INPUT[el.getAttribute('data-change')]) INPUT[el.getAttribute('data-change')](el, e); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOpen()) closeModal(); });
  ACT.copy = el => copy(el.getAttribute('data-v') || '');
  ACT.logout = () => logout();
  ACT.go = el => go(el.getAttribute('data-to'));
  ACT.reload = () => { refreshDeps(); toast('Memuat ulang data…'); };

  /* ---------------- router ---------------- */
  const routes = [];
  function route(re, def) { routes.push({ re: re, def: def }); }
  function parseHash() { let h = (location.hash || '').replace(/^#/, ''); if (!h || h === '/') h = '/'; else if (h.charAt(0) !== '/' && /^[A-Za-z0-9][\w.\-]{2,29}$/.test(h)) h = '/@' + h.toLowerCase(); const i = h.indexOf('?'); return { path: i < 0 ? h : h.slice(0, i), q: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) }; }
  function go(path, replace) { if (replace) location.replace('#' + path); else location.hash = '#' + path; }
  function resolve(path) { for (const r of routes) { const m = path.match(r.re); if (m) return { def: r.def, m: m }; } return null; }
  function ensureShell(layout) {
    if (S.layout === layout) return; if (S.layout === 'bare') { document.body.style.background = ''; } S.layout = layout;
    const app = $('#app');
    if (layout === 'bare') { app.innerHTML = '<main id="view"></main>'; document.body.classList.remove('has-bnav'); S.chromeKey = ''; return; }
    if (layout === 'pub') {
      app.innerHTML = '<div id="banner"></div><header id="topbar"><div class="wrap-c tb"><a class="brand" href="#/" id="brand"></a><nav class="nav-l" id="nav-pub"></nav><div class="tb-r" id="acct"></div></div></header><main id="view"></main><footer class="ft" id="foot"></footer><nav id="bnav"></nav>';
    } else {
      app.innerHTML = '<div class="app"><aside class="side"><a class="brand" href="#/" id="brand"></a><nav id="side-nav" class="col" style="gap:2px"></nav><div class="foot" id="side-foot"></div></aside><div class="main"><header class="apptop"><a class="brand" href="#/" id="brand2"></a><div class="lbl" id="lbl"></div><div class="me" id="acct"></div></header><div id="banner"></div><main id="view" class="page"></main></div></div><nav id="bnav"></nav>';
    }
    document.body.classList.add('has-bnav'); S.chromeKey = '';
  }
  let renderT = 0, rvIO = null;
  const RV_SEL = '.hero-g>*, .sec-h, .g3>*, .g4>*, .svc-grid>*, .svc-app, .mq, .cta-band .wrap-c>*, .sec>.wrap-c>.card, .tst-g>*, .ft-g>*';
  function reveal(root) {
    if (!('IntersectionObserver' in w) || (w.matchMedia && w.matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
    if (rvIO) rvIO.disconnect();
    const done = el => { el.classList.add('in'); setTimeout(() => { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, 1000); };
    rvIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { done(e.target); rvIO.unobserve(e.target); } }), { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    const seen = new Set();
    root.querySelectorAll(RV_SEL).forEach(el => { if (seen.has(el) || el.closest('.rv')) return; seen.add(el); const sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0; el.classList.add('rv'); el.style.transitionDelay = Math.min(sib, 5) * 70 + 'ms'; rvIO.observe(el); });
    setTimeout(() => root.querySelectorAll('.rv:not(.in)').forEach(done), 2500);
  }
  function renderRoute(soft) {
    if (!soft && modalOpen()) closeModal(true);
    const t0 = performance.now(), p = parseHash(); let hit = resolve(p.path);
    if (!hit) hit = resolve('/404');
    const def = hit.def;
    if (def.auth) {
      if (!S.session) { try { sessionStorage.setItem('nk.next', p.path); } catch (e) { } return go('/masuk', true); }
      if (def.auth === 'admin' && S.session.role !== 'superadmin') { toast('Halaman khusus admin.', 'err'); return go('/saya', true); }
    }
    ensureShell(def.layout || 'pub');
    S.deps = new Set(); S.route = { path: p.path, q: p.q, def: def, m: hit.m };
    const view = $('#view'), y = w.scrollY;
    if (!soft && def.enter) { try { def.enter(hit.m, p.q); } catch (e) { console.error(e); } }
    let html; try { html = def.render(hit.m, p.q, p.path); } catch (err) { console.error(err); html = '<div class="empty">' + ic('alert') + '<p>Terjadi kesalahan menampilkan halaman.</p></div>'; }
    view.innerHTML = html;
    if (!soft && (def.layout || 'pub') === 'pub') reveal(view);
    const ttl = typeof def.title === 'function' ? def.title(hit.m) : def.title; document.title = (ttl ? ttl + ' · ' : '') + appName();
    S.chromeKey = ''; chromeUpdate();
    if (soft) w.scrollTo(0, y); else { const aid = typeof def.anchor === 'function' ? def.anchor(hit.m) : def.anchor, a = aid ? $('#' + aid) : null; if (a) w.scrollTo(0, a.getBoundingClientRect().top + w.scrollY - 70); else w.scrollTo(0, 0); }
    if (def.mount) { try { def.mount(view, hit.m, p.q); } catch (err) { console.error(err); } }
    S.pendingSoft = false; renderT = performance.now() - t0; Perf.render.push({ path: p.path, ms: Math.round(renderT * 10) / 10 }); if (Perf.render.length > 60) Perf.render.shift();
    track(p.path);
  }
  function isEditing() { const a = document.activeElement, v = $('#view'); return !!(a && v && v.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); }
  function softRender() { if (isEditing()) { S.pendingSoft = true; return; } if (S.route) { S.pendingSoft = false; renderRoute(true); } }
  document.addEventListener('focusout', () => { if (S.pendingSoft) setTimeout(() => { if (!isEditing() && S.pendingSoft) softRender(); }, 150); });
  w.addEventListener('hashchange', () => renderRoute(false));

  /* ---------------- data publik, sesi, chrome ---------------- */
  const DEFAULT_PUB = {
    settings: { nama_app: 'Nabire Kreatif', tagline: 'Membangun Masa Depan Digital Nabire', hero_badge: 'Akselerasi Digital Papua Tengah', hero_judul: 'Membangun Masa Depan Digital', hero_judul_aksen: 'Nabire', hero_sub: 'Nabire Kreatif adalah mitra strategis untuk UMKM dan pebisnis online. Kami percaya setiap bisnis berhak memiliki tampilan profesional tanpa harus mengeluarkan biaya puluhan juta.', hero_stat: '[{"n":"35+","l":"UMKM Nabire Go Digital"},{"n":"100%","l":"Akses Google Cloud"},{"n":"< 3 Hari","l":"Proses Bisa Cepat"}]', beranda_bagian: 'layanan,demo,katalog,testimoni,pesan', wa_admin: '', wa_tampil: '', email_publik: '', alamat: 'Nabire, Papua Tengah', footer_deskripsi: 'Akselerator ekosistem digital untuk pelaku UMKM, talenta muda kreatif, dan institusi di wilayah Nabire dan Papua Tengah.', logo_url: '', rekening: '[]', qris_url: '', info_bayar: 'Pembayaran diverifikasi manual oleh Admin. Akses terbuka otomatis setelah disetujui.', google_client_id: '' },
    services: [
      { id: 'SVC-1', nama: 'Landing Page Promosi', kategori: 'Website', deskripsi: 'Website 1 halaman berfokus konversi untuk promosi produk/jasa lewat WhatsApp.', harga_mulai: 350000, fitur: 'Desain mobile-first|Tombol WhatsApp & promosi|Gratis domain subdomain' },
      { id: 'SVC-2', nama: 'Website Toko Online', kategori: 'Website', deskripsi: 'Katalog produk interaktif dengan keranjang belanja, checkout lewat WhatsApp, dan QRIS statis.', harga_mulai: 750000, fitur: 'Manajemen produk via Google Sheets|Notifikasi pesanan ke WhatsApp|Scan QRIS' },
      { id: 'SVC-3', nama: 'Company Profile UMKM', kategori: 'Website', deskripsi: 'Profil bisnis legal, rapi, dan profesional untuk UMKM dan perusahaan lokal.', harga_mulai: 500000, fitur: 'Optimasi Google Bisnis & SEO lokal|Formulir pertanyaan|Email bisnis profesional' },
      { id: 'SVC-4', nama: 'Undangan Digital Premium', kategori: 'Website', deskripsi: 'Undangan pernikahan, syukuran, atau acara lain dengan RSVP online dan musik latar.', harga_mulai: 200000, fitur: 'Tamu khusus & link kustom|Galeri pre-wedding|Buku tamu online' },
      { id: 'SVC-5', nama: 'Aplikasi Web Kasir / POS', kategori: 'Aplikasi', deskripsi: 'Aplikasi kasir multi-device (HP, tablet, laptop) dengan Google Sheets sebagai database.', harga_mulai: 1200000, fitur: 'Cetak struk & laporan|Stok otomatis|Tanpa biaya langganan bulanan' }
    ], demos: [], testimonials: [], products: []
  };
  function pubData() { const e = sget('pub', 'pub'); return e ? e.v : DEFAULT_PUB; }
  function usePub() { use('pub', { scope: 'pub', ttl: 90000 }); return pubData(); }
  const setting = k => { const s = pubData().settings || {}; return s[k] === undefined ? (DEFAULT_PUB.settings[k] || '') : s[k]; };
  const appName = () => setting('nama_app') || 'Nabire Kreatif';
  const bootData = () => { const e = sget('u', 'boot'); return e ? e.v : null; };
  const admData = () => { const e = sget('u', 'adm'); return e ? e.v : null; };
  const isAdmin = () => !!(S.session && S.session.role === 'superadmin');
  function jsonSetting(k) { try { const j = JSON.parse(setting(k) || '[]'); return Array.isArray(j) ? j : []; } catch (e) { return []; } }
  function logoImg() { return safeUrl(setting('logo_url')) || 'assets/logo-icon.png'; }
  function brandHTML(sub) { return '<img src="' + esc(logoImg()) + '" alt="" width="38" height="38"><span><b>' + brandName() + '</b><small>' + esc(sub) + '</small></span>'; }
  function brandName() { const n = appName().split(' '); return esc(n[0]) + (n.length > 1 ? ' <i>' + esc(n.slice(1).join(' ')) + '</i>' : ''); }

  function applySession(res) {
    const sess = { token: res.token, role: res.role, email: res.email, nama: res.nama };
    saveSession(sess);
    if (res.boot) sset('u', 'boot', res.boot);
    if (res.admin) sset('u', 'adm', res.admin);
    afterLogin();
  }
  function afterLogin() {
    startPolling();
    if (isAdmin()) prefetch(['orders', 'members', 'c:Products', 'codes', 'reqs', 'settings', 'crmstats', 'c:Services']);
  }
  function logout(msg) {
    const em = S.session && S.session.email; saveSession(null); if (em) clearUser(em); stopPolling();
    S.layout = ''; if (msg) toast(msg, 'err'); go('/', true); renderRoute(false);
  }
  function forceLogout(msg) { logout(msg); }

  const NAV_PUB = [['/', 'Beranda'], ['/layanan', 'Layanan Web'], ['/katalog', 'Produk Digital'], ['/katalog/kelas', 'Kelas Online'], ['/demo', 'Portofolio & Demo'], ['/testimoni', 'Testimoni']];
  const SIDE_MEM = [['/saya', 'Beranda Member', 'grid'], ['/saya/kelas', 'Kelas & Materi Saya', 'cap'], ['/saya/aset', 'Aset & Lisensi Digital', 'cloud'], ['/saya/riwayat', 'Riwayat & Invoice', 'receipt'], ['/saya/linkbio', 'Link Bio Saya', 'link'], ['/saya/klaim', 'Klaim Token Baru', 'key'], ['/saya/profil', 'Profil & Keamanan', 'user']];
  const SIDE_ADM = [
    ['Ringkasan', [['/admin', 'Dasbor Admin', 'grid'], ['/admin/statistik', 'Statistik Web', 'chart']]],
    ['Transaksi', [['/admin/persetujuan', 'Pusat Persetujuan', 'shield', 'pend'], ['/admin/kode', 'Kode Akses', 'key'], ['/admin/jasa', 'Pesanan Jasa', 'mega', 'jasa']]],
    ['Katalog', [['/admin/produk', 'Produk & Kelas', 'box'], ['/admin/galeri', 'Galeri Demo', 'image'], ['/admin/linkbio', 'Link Bio', 'link'], ['/admin/lisensi', 'Lisensi Template', 'shield'], ['/admin/layanan', 'Layanan Jasa', 'tag'], ['/admin/testimoni', 'Testimoni', 'star']]],
    ['Pelanggan', [['/admin/member', 'Daftar Member', 'users'], ['/admin/crm', 'CRM Pelanggan', 'contact'], ['/admin/wa', 'WhatsApp & Notifikasi', 'chat']]],
    ['Sistem', [['/admin/beranda', 'Pengaturan Beranda', 'sliders'], ['/admin/backup', 'Backup Data', 'cloud'], ['/admin/migrasi', 'Migrasi Data', 'upload'], ['/admin/sistem', 'Backend GAS & Basis Data', 'db']]]
  ];
  function activeIn(path, to) { if (to === '/') return path === '/'; if (to === '/saya' || to === '/admin') return path === to; return path === to || path.indexOf(to + '/') === 0; }
  function chromeUpdate() {
    if (!S.route || S.layout === 'bare') return; const path = S.route.path, lay = S.layout, boot = bootData(), adm = admData(), pend = adm ? (adm.kpi.menunggu || 0) : 0, jasa = adm ? (adm.kpi.jasa_baru || 0) : 0;
    const key = [lay, path.split('/').slice(0, 3).join('/'), S.session && S.session.email, S.session && S.session.nama, pend, jasa, setting('nama_app'), setting('logo_url'), setting('wa_admin'), setting('alamat'), isAdmin()].join('|') + (lay === 'pub' ? '|' + hash(pubData().settings) : '');
    if (key === S.chromeKey) return; S.chromeKey = key;
    const me = S.session, wa = setting('wa_admin');
    const setH = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };
    if (lay === 'pub') {
      setH('#brand', brandHTML('Digital Hub Nabire'));
      setH('#nav-pub', NAV_PUB.map(n => '<a href="#' + n[0] + '" class="' + (activeIn(path, n[0]) ? 'on' : '') + '">' + n[1].replace(' ', '<br>') + '</a>').join(''));
      setH('#acct', '<a class="btn out hid-m" href="#/redeem">' + ic('key', 'sm') + 'Redeem Kode</a>' + (me ? '<a class="btn soft" href="#/saya">' + ic('user', 'sm') + '<span class="hid-m">Area Member</span></a>' : '<a class="btn soft" href="#/masuk">' + ic('user', 'sm') + '<span>Masuk</span></a>') + '<a class="btn pri hid-m" href="#/jasa">' + ic('send', 'sm') + 'Konsultasi</a>');
      const rk = jsonSetting('rekening');
      setH('#foot', footerHTML());
      setH('#bnav', bnav([['/', 'Beranda', 'home'], ['/katalog', 'Katalog', 'box'], ['/redeem', 'Redeem', 'key'], [me ? '/saya' : '/masuk', 'Member', 'user']].concat(isAdmin() ? [['/admin', 'Admin', 'grid']] : []), path));
      const bn = $('#banner'); if (bn) bn.innerHTML = S.gas ? '' : '<div class="banner">Mode pratinjau — backend belum tersambung. Isi <b>GAS_URL</b> di <code>js/config.js</code> (lihat PANDUAN-INSTALASI.md).</div>';
    } else if (lay === 'mem') {
      setH('#brand', brandHTML('Member Workspace')); setH('#brand2', brandHTML('Member'));
      setH('#lbl', ic('bulb', 'sm') + 'NABIRE DIGITAL ACCESS');
      setH('#side-nav', SIDE_MEM.map(n => '<a class="m ' + (sideOn(path, n[0]) ? 'on' : '') + '" href="#' + n[0] + '">' + ic(n[2]) + '<span>' + n[1] + '</span></a>').join(''));
      setH('#side-foot', '<div class="syncbox"><b>● Akses Terverifikasi</b>Materi tersimpan aman. Link unduhan hanya tampil untuk pemilik akses.</div>' + (isAdmin() ? '<a class="m side-a" style="display:flex;gap:12px;padding:11px 14px;font-size:14px;font-weight:600;color:var(--mute)" href="#/admin">' + ic('grid') + 'Panel Admin</a>' : '') + '<a class="m side-a" style="display:flex;gap:12px;padding:11px 14px;font-size:14px;font-weight:600;color:var(--mute)" href="#/">' + ic('logout') + 'Kembali ke Portal Publik</a><button class="m side-a" style="display:flex;gap:12px;padding:11px 14px;font-size:14px;font-weight:600;color:var(--err);width:100%" data-act="logout">' + ic('logout') + 'Keluar</button>');
      setH('#acct', acctHTML());
      setH('#bnav', bnav([['/', 'Beranda', 'home'], ['/katalog', 'Katalog', 'box'], ['/saya', 'Member', 'user']].concat(isAdmin() ? [['/admin', 'Admin', 'grid']] : [['/redeem', 'Redeem', 'key']]), path));
    } else {
      setH('#brand', brandHTML('Admin Console')); setH('#brand2', brandHTML('Admin'));
      setH('#lbl', ic('server', 'sm') + 'NABIRE ADMIN CONSOLE');
      setH('#side-nav', SIDE_ADM.map(g => '<div class="sec-t">' + g[0] + '</div>' + g[1].map(n => '<a class="m ' + (sideOn(path, n[0]) ? 'on' : '') + '" href="#' + n[0] + '">' + ic(n[2]) + '<span>' + n[1] + '</span>' + (n[3] === 'pend' && pend ? '<span class="cnt">' + pend + '</span>' : '') + (n[3] === 'jasa' && jasa ? '<span class="cnt">' + jasa + '</span>' : '') + '</a>').join('')).join(''));
      setH('#side-foot', '<a class="m side-a" style="display:flex;gap:12px;padding:11px 14px;font-size:14px;font-weight:600;color:var(--mute)" href="#/saya">' + ic('user') + 'Lihat sebagai Member</a><a class="m side-a" style="display:flex;gap:12px;padding:11px 14px;font-size:14px;font-weight:600;color:var(--mute)" href="#/">' + ic('logout') + 'Kembali ke Portal Publik</a><button class="m side-a" style="display:flex;gap:12px;padding:11px 14px;font-size:14px;font-weight:600;color:var(--err);width:100%" data-act="logout">' + ic('logout') + 'Keluar</button>');
      { const f = document.getElementById('side-foot'); if (f && !f.querySelector('.ver')) f.insertAdjacentHTML('beforeend', '<div class="ver small muted" style="padding:6px 14px">Versi 3.0 · Lisensi Template &amp; Link Bio baru</div>'); }
      setH('#acct', acctHTML());
      setH('#bnav', bnav([['/admin', 'Dasbor', 'grid'], ['/admin/persetujuan', 'Persetujuan', 'shield', pend], ['/admin/member', 'Member', 'users'], ['/admin/menu', 'Menu', 'menu']], path));
    }
  }
  const sideOn = (path, to) => (to === '/saya' ? path === '/saya' : to === '/admin' ? path === '/admin' : path === to || path.indexOf(to + '/') === 0);
  function bnav(items, path) { return items.map(n => '<a href="#' + n[0] + '" class="' + (activeIn(path, n[0]) || (n[0] === '/katalog' && path.indexOf('/produk') === 0) ? 'on' : '') + '">' + ic(n[2]) + (n[3] ? '<span class="bd">' + n[3] + '</span>' : '') + '<span>' + n[1] + '</span></a>').join(''); }
  function acctHTML() { const me = S.session; if (!me) return ''; return '<button class="btn ghost" data-act="reload" title="Muat ulang data" aria-label="Muat ulang">' + ic('refresh') + '</button><div class="t"><b>' + esc(me.nama || me.email) + '</b><span>' + (me.role === 'superadmin' ? 'Super Admin' : 'Lisensi Terverifikasi') + '</span></div><div class="avatar">' + esc(initials(me.nama || me.email)) + '</div>'; }
  function footerHTML() {
    const wa = setting('wa_admin'), tampil = setting('wa_tampil'), em = setting('email_publik');
    return '<div class="wrap-c"><div class="ft-g"><div><a class="brand" href="#/">' + brandHTML('Digital Hub Nabire') + '</a><p class="small muted" style="margin-top:12px;max-width:340px">' + esc(setting('footer_deskripsi')) + '</p></div><div><h5>Layanan & Katalog</h5><ul><li><a href="#/layanan">Website UMKM & Bisnis</a></li><li><a href="#/katalog">Produk Digital & Template</a></li><li><a href="#/katalog/kelas">Kelas Online Video</a></li><li><a href="#/demo">Galeri Karya Demo</a></li></ul></div><div><h5>Akses Member</h5><ul><li><a href="#/redeem">Redeem Kode Akses</a></li><li><a href="#/masuk">Masuk Area Member</a></li><li><a href="#/daftar">Daftar Akun Baru</a></li><li><a href="#/jasa">Pesan Jasa Website</a></li></ul></div><div><h5>Kontak & Dukungan</h5><ul>' + (wa ? '<li class="row">' + ic('chat', 'sm') + '<a href="' + esc(waLink(wa)) + '" target="_blank" rel="noopener">WhatsApp ' + esc(tampil || wa) + '</a></li>' : '') + '<li class="row">' + ic('pin', 'sm') + '<span>' + esc(setting('alamat')) + '</span></li>' + (em ? '<li class="row">' + ic('mail', 'sm') + '<a href="mailto:' + esc(em) + '">' + esc(em) + '</a></li>' : '') + '</ul></div></div><div class="ft-b"><span>© ' + new Date().getFullYear() + ' ' + esc(appName()) + '. Seluruh hak cipta dilindungi.</span><span>Wilayah waktu: WIT (UTC+9)</span></div></div>';
  }

  /* ---------------- polling ringan (hanya admin) + sinkron saat kembali ke tab ---------------- */
  let pollT = 0;
  function startPolling() { stopPolling(); if (!S.session) return; pollT = setInterval(() => { if (document.hidden || !S.session) return; if (isAdmin()) { const before = (admData() || { kpi: {} }).kpi.menunggu || 0; revalidate('u', 'adm', {}).then(() => { const now = (admData() || { kpi: {} }).kpi.menunggu || 0; if (now > before) { toast('🔔 Ada ' + (now - before) + ' pembayaran baru menunggu persetujuan', 'ok', 5000); stale('u', 'orders'); } }); } }, 45000); }
  function stopPolling() { if (pollT) clearInterval(pollT); pollT = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden || !S.session) return; const e = sget('u', S.session.role === 'superadmin' ? 'adm' : 'boot'); if (!e || Date.now() - e.t > 120000) { revalidate('u', 'boot', {}); if (isAdmin()) revalidate('u', 'adm', {}); } });

  /* ---------------- pelacakan kunjungan (ringan: 1 panggilan per halaman, jeda 4 dtk) ---------------- */
  let trackT = 0, trackLast = '';
  function track(path) {
    if (!S.gas || (S.session && S.session.role === 'superadmin') || path === trackLast) return; trackLast = path; clearTimeout(trackT);
    trackT = setTimeout(() => { let sid = ''; try { sid = sessionStorage.getItem('nk.sid') || ''; if (!sid) { sid = 's' + uid(); sessionStorage.setItem('nk.sid', sid); } } catch (e) { sid = 'x' + uid(); } api('visit.track', { sid: sid, page: path.split('/').slice(0, 3).join('/') || '/', mobile: w.innerWidth < 800 }, { quiet: true, tries: 1 }); }, 4000);
  }

  /* ---------------- gambar: kompres sebelum unggah ---------------- */
  function readFile(file, maxDim, q) {
    return new Promise((res, rej) => {
      if (!file) return rej(new Error('Berkas kosong'));
      if (file.type === 'application/pdf') { if (file.size > 3000000) return rej(new Error('PDF terlalu besar (maks 3 MB).')); const fr = new FileReader(); fr.onload = () => res({ mime: 'application/pdf', name: file.name, data: String(fr.result).split(',')[1], preview: '' }); fr.onerror = () => rej(new Error('Gagal membaca berkas')); return fr.readAsDataURL(file); }
      if (!/^image\//.test(file.type)) return rej(new Error('Pilih gambar (JPG/PNG/WEBP) atau PDF.'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const s = Math.min(1, (maxDim || 1600) / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); const d = c.toDataURL('image/jpeg', q || 0.82); res({ mime: 'image/jpeg', name: file.name.replace(/\.\w+$/, '') + '.jpg', data: d.split(',')[1], preview: d }); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Gambar tidak bisa dibaca')); }; img.src = url;
    });
  }

  /* ---------------- unggah foto (menggantikan input URL) ---------------- */
  /** o: {name, value, kind, label, api, round, max, attrs(hidden), hint, small} → kontrol unggah dengan pratinjau */
  function imgField(o) {
    const v = o.value || '', id = 'imgf-' + uid();
    return '<div class="imgf ' + (o.small ? 'sm ' : '') + (v ? 'has' : '') + '" data-api="' + esc(o.api || 'upload.image') + '" data-kind="' + esc(o.kind || 'umum') + '" data-max="' + (o.max || 1400) + '">' +
      '<div class="imgf-pv ' + (o.round ? 'round' : '') + '">' + (v ? '<img src="' + esc(v) + '" alt="">' : ic('image')) + '<i class="imgf-spin"></i></div>' +
      '<div class="imgf-b"><label class="btn soft sm" for="' + id + '">' + ic('camera', 'sm') + '<span class="t-up">' + (v ? 'Ganti foto' : 'Unggah foto') + '</span></label><button type="button" class="btn ghost sm imgf-x" data-act="img-clear">' + ic('x', 'sm') + 'Hapus</button>' + (o.hint ? '<div class="hint">' + esc(o.hint) + '</div>' : '') + '</div>' +
      '<input type="file" id="' + id + '" accept="image/*" hidden data-change="img-up"><input type="hidden" ' + (o.name ? 'name="' + esc(o.name) + '" ' : '') + (o.attrs || '') + ' value="' + esc(v) + '"></div>';
  }
  function imgSet(wrap, url, preview) {
    const hid = wrap.querySelector('input[type=hidden]'), pv = wrap.querySelector('.imgf-pv');
    hid.value = url || ''; wrap.classList.toggle('has', !!(url || preview));
    const old = pv.querySelector('img'); if (old) old.remove();
    if (url || preview) { const im = new Image(); im.alt = ''; im.src = preview || url; pv.insertBefore(im, pv.firstChild); const sv = pv.querySelector('svg'); if (sv) sv.style.display = 'none'; } else { const sv = pv.querySelector('svg'); if (sv) sv.style.display = ''; }
    const t = wrap.querySelector('.t-up'); if (t) t.textContent = (url || preview) ? 'Ganti foto' : 'Unggah foto';
    hid.dispatchEvent(new Event('input', { bubbles: true }));
  }
  INPUT['img-up'] = async el => {
    const f = el.files && el.files[0], wrap = el.closest('.imgf'); if (!f || !wrap) return;
    if (!S.gas) { el.value = ''; return toast('Backend belum tersambung — isi GAS_URL di js/config.js.', 'err'); }
    wrap.classList.add('up');
    try {
      const r = await readFile(f, +wrap.getAttribute('data-max') || 1400, 0.85); if (r.mime === 'application/pdf') throw new Error('Pilih berkas gambar (JPG/PNG/WEBP).');
      const res = await api(wrap.getAttribute('data-api'), { data: r.data, mime: r.mime, name: r.name, kind: wrap.getAttribute('data-kind') });
      if (!res.success) throw new Error(res.message || 'Gagal mengunggah.');
      imgSet(wrap, res.data.url, r.preview);   // pratinjau lokal seketika; URL server disimpan
    } catch (e) { toast(e.message || 'Gagal mengunggah foto.', 'err', 5000); }
    finally { wrap.classList.remove('up'); el.value = ''; }
  };
  ACT['img-clear'] = el => { const wrap = el.closest('.imgf'); if (wrap) imgSet(wrap, ''); };
  /** Alamat publik halaman Link Bio: domain-yang-sedang-dipakai/#nama */
  const shareUrl = slug => (location.origin + location.pathname).replace(/index\.html$/, '') + '#' + slug;

  /* ---------------- Google Identity (dimuat malas) ---------------- */
  let gisP = null;
  function loadGIS() { if (gisP) return gisP; gisP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); return gisP; }
  function mountGoogle(el, onCred) {
    const cid = setting('google_client_id') || CFG.GOOGLE_CLIENT_ID; if (!el || !cid) return;
    loadGIS().then(() => { if (!w.google || !el.isConnected) return; w.google.accounts.id.initialize({ client_id: cid, callback: r => onCred(r.credential), ux_mode: 'popup' }); w.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: Math.min(360, el.clientWidth || 360), text: 'continue_with', shape: 'rectangular', locale: 'id' }); }).catch(() => { el.innerHTML = '<p class="tiny muted">Login Google tidak dapat dimuat.</p>'; });
  }

  /* ---------------- start ---------------- */
  function start() {
    purgeOld(); loadSession();
    if (!S.gas) console.warn('NK: GAS_URL kosong — isi js/config.js');
    if (S.session) afterLogin();
    usePubBoot();
    if (!location.hash) location.hash = '#/'; else renderRoute(false);
    if (S.session) { revalidate('u', 'boot', {}); if (isAdmin()) revalidate('u', 'adm', {}); }
    w.addEventListener('online', () => toast('Kembali online', 'ok'));
    w.addEventListener('offline', () => toast('Anda offline — menampilkan data tersimpan', 'err'));
  }
  function usePubBoot() { if (/^#\/?@|^#[A-Za-z0-9][\w.\-]{2,29}$/.test(location.hash)) return; const e = sget('pub', 'pub'); if (!e || Date.now() - e.t > 90000) { if (S.gas) revalidate('pub', 'pub', {}); } }
  function pageNotFound() { return '<div class="wrap-c sec center"><h1 class="h1">404</h1><p class="muted mt">Halaman tidak ditemukan.</p><a class="btn pri mt" href="#/">Ke Beranda</a></div>'; }
  route(/^\/404$/, { layout: 'pub', title: 'Tidak ditemukan', render: pageNotFound });

  w.NK = { imgField, imgSet, shareUrl, onData, S, $, $$, esc, rp, num, dt, tm, dtm, ago, hash, uid, clone, debounce, idle, safeUrl, initials, num62, waLink, ytEmbed, pdfEmbed, dlUrl, driveId, copy, download, csvCell, parseCSV, ic, ICONS, api, use, sget, sset, stale, optimistic, patchData, refreshDeps, prefetch, revalidate, emit, hasEntry, toast, modal, closeModal, modalOpen, confirmBox, busy, ACT, FORM, INPUT, route, go, renderRoute, softRender, chromeUpdate, pubData, usePub, setting, appName, bootData, admData, isAdmin, jsonSetting, applySession, logout, readFile, mountGoogle, start, brandHTML, srcOf, DEFAULT_PUB, saveSession, TZ };
})(window);
