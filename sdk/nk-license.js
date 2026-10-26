/*! nk-license.js v4 — Lisensi & perlindungan template web Nabire Kreatif
 *  Pasang di <head> template paling atas:  <script src="nk-license.js"></script>
 *  Konfigurasi (window.NKL) ada di baris pertama berkas ini (diisi dari Admin → Lisensi Template).
 *
 *  Perilaku:
 *   • Domain milik penjual / localhost  → tampil normal (lencana hak cipta kecil).
 *   • Domain berlisensi                 → tampil normal; pengunjung mana pun TIDAK diminta kode.
 *   • Domain belum berlisensi           → mode DEMO: pita "DEMO", bilah hak cipta, tombol Beli & Aktifkan.
 *   • Hak cipta / skrip template diubah → halaman TERKUNCI: tombol & fungsi tidak bereaksi.
 *  Menu lisensi: buka  domain.com/#key  (landing page) atau pasang data-nk-license pada menu dasbor / NKLicense.open().
 *  Kode lisensi cukup dimasukkan SEKALI per domain (server mengenali domain; pengunjung lain otomatis lolos).
 */
(function (w, d) {
  'use strict';
  var C = w.NKL || {}, DAY = 86400, STORE = 'nkl:v2:', OPEN = w.__NKL_OPEN__ === true; /* OPEN: hanya untuk pengujian otomatis */
  var SITUS = String(C.situs || 'https://nabirekreatif.com').replace(/\/+$/, ''), BELI = C.beli || SITUS;
  var COPY = '© ' + new Date().getFullYear() + ' Nabire Kreatif', COPYURL = SITUS + '/';
  var host = String(location.hostname || '').toLowerCase().replace(/^www\./, '');
  var selfSrc = (d.currentScript && d.currentScript.src) || '';
  var subtle = w.crypto && w.crypto.subtle;
  function isNat(f) { try { return /\[native code\]/.test(Function.prototype.toString.call(f)); } catch (e) { return false; } }
  var nativeBad = !!(subtle && !(isNat(subtle.verify) && isNat(subtle.digest) && isNat(subtle.importKey) ));
  var nat = { fetch: w.fetch && w.fetch.bind(w), verify: subtle && subtle.verify.bind(subtle), imp: subtle && subtle.importKey.bind(subtle), dig: subtle && subtle.digest.bind(subtle) };
  var enc = new TextEncoder(), dec = new TextDecoder();

  /* ---------- utilitas ---------- */
  function b64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function now() { return Math.floor(Date.now() / 1000); }
  function get(k) { try { return JSON.parse(localStorage.getItem(STORE + k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(STORE + k); else localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) { } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var isDev = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(host) || /\.localhost$/.test(host);
  function isOwner() { var o = C.owner || []; for (var i = 0; i < o.length; i++) { var x = String(o[i]).toLowerCase().replace(/^www\./, ''); if (x && (host === x || host.slice(-(x.length + 1)) === '.' + x)) return true; } return false; }
  function sha(t) { return nat.dig('SHA-256', enc.encode(t)).then(function (b) { var a = new Uint8Array(b), s = ''; for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16); return s; }); }
  function norm(s) { return String(s).replace(/^﻿/, '').replace(/\r/g, '').replace(/\s+/g, ' ').trim(); }
  function fetchText(u) { return nat.fetch(u, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }); }

  /* ---------- status & API publik (dibekukan) ---------- */
  var state = { mode: 'cek', msg: '', exp: 0 }, decided = false, res, locked = false;
  var ready = new Promise(function (r) { res = r; });
  function snap() { return { mode: state.mode, host: host, exp: state.exp, msg: state.msg, licensed: state.mode === 'lisensi' || state.mode === 'owner' || state.mode === 'dev' }; }
  try { Object.defineProperty(w, 'NKLicense', { value: Object.freeze({ ready: ready, host: host, status: snap, open: function () { if (!locked) openPanel(); } }), writable: false, configurable: false }); } catch (e) { }

  /* ---------- UI (Shadow DOM tertutup: CSS/JS halaman tidak bisa menjangkau) ---------- */
  var HOST_CSS = 'all:initial!important;position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;margin:0!important;padding:0!important;overflow:visible!important;';
  var CSS = ':host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.rb{position:fixed;top:26px;left:-48px;width:190px;transform:rotate(-45deg);background:#DC2626;color:#fff;text-align:center;font:800 13px/26px system-ui;letter-spacing:.25em;box-shadow:0 2px 10px rgba(0,0,0,.4);pointer-events:none;display:none}' +
    '.w[data-m=demo] .rb{display:block}' +
    '.bar{position:fixed;left:0;right:0;bottom:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 14px;padding:10px 14px;background:#0b1220;color:#e2e8f0;font-size:13px;line-height:18px;pointer-events:auto;box-shadow:0 -4px 20px rgba(0,0,0,.35)}' +
    '.cp{color:#fff;font-weight:700;text-decoration:none;white-space:nowrap}.cp:hover{text-decoration:underline}' +
    '.st{opacity:.9}.btn{border:0;border-radius:999px;padding:8px 16px;font:700 13px/18px system-ui;cursor:pointer;text-decoration:none;display:inline-block}' +
    '.b1{background:#F28500;color:#fff}.b2{background:#fff;color:#0b1220}' +
    '.w:not([data-m=demo]) .dm{display:none}.w[data-m=demo] .ok,.w[data-m=cek] .ok{display:none}' +
    '.w:not([data-m=demo]) .bar{left:12px;right:auto;bottom:12px;border-radius:999px;padding:6px 14px;gap:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,.3);opacity:.92}' +
    '.pn{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(2,6,23,.6);display:none;align-items:center;justify-content:center;padding:18px;pointer-events:auto}.pn.on{display:flex}' +
    '.cd{width:100%;max-width:400px;background:#fff;color:#0f172a;border-radius:20px;padding:24px 22px;box-shadow:0 24px 70px rgba(0,0,0,.5);text-align:center}' +
    '.cd h2{margin:0 0 6px;font-size:20px;line-height:26px}.cd p{margin:0 0 14px;font-size:14px;line-height:21px;color:#475569}' +
    '.cd input{width:100%;height:48px;border:1.5px solid #cbd5e1;border-radius:12px;padding:0 14px;font:700 16px ui-monospace,Menlo,monospace;text-align:center;letter-spacing:.04em;outline:none;text-transform:uppercase}.cd input:focus{border-color:#F28500}' +
    '.cd .btn{width:100%;margin-top:10px;padding:13px 16px;font-size:15px}.cd .b3{background:#e2e8f0;color:#0f172a}' +
    '.er{min-height:18px;margin-top:8px;font-size:13px;font-weight:600;color:#b91c1c}.sc{color:#15803d}' +
    '.lk{position:fixed;left:0;top:0;right:0;bottom:0;background:linear-gradient(160deg,#450a0a,#0b1220);display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:auto;overflow:auto}';
  var host_el, root, W, pn, kIn, er, goBtn, cpA, stEl, bar, lockEl, lockRoot, HATTR = '', HKEYS = '';

  function mk(tag, html) { var e = d.createElement(tag); if (html) e.innerHTML = html; return e; }
  function buildUI() {
    host_el = d.createElement('div'); host_el.setAttribute('data-nkl', '1'); host_el.style.cssText = HOST_CSS;
    root = host_el.attachShadow({ mode: OPEN ? 'open' : 'closed' });
    root.innerHTML = '<style>' + CSS + '</style><div class="w" data-m="cek"><div class="rb">DEMO</div>' +
      '<div class="bar"><a class="cp" href="' + esc(COPYURL) + '" target="_blank" rel="noopener">' + esc(COPY) + '</a>' +
      '<span class="st dm">Template DEMO — belum berlisensi</span><span class="st ok" id="ok">Template berlisensi</span>' +
      '<a class="btn b2 dm" id="beli" href="' + esc(BELI) + '" target="_blank" rel="noopener">Beli Lisensi</a>' +
      '<button class="btn b1 dm" id="act" type="button">Aktifkan Lisensi</button><button class="btn b2 ok" id="inf" type="button">Info</button></div>' +
      '<div class="pn" id="pn" role="dialog" aria-modal="true"><div class="cd" id="cd"></div></div></div>';
    W = root.querySelector('.w'); pn = root.getElementById ? root.getElementById('pn') : root.querySelector('#pn'); bar = root.querySelector('.bar'); cpA = root.querySelector('.cp'); stEl = root.querySelector('#ok');
    root.querySelector('#act').addEventListener('click', openPanel); root.querySelector('#inf').addEventListener('click', openPanel);
    pn.addEventListener('click', function (e) { if (e.target === pn) closePanel(); });
    d.documentElement.appendChild(host_el);
    HATTR = host_el.getAttribute('style'); HKEYS = Array.prototype.map.call(host_el.attributes, function (a) { return a.name; }).sort().join(',');
  }
  function closePanel() { if (pn) pn.classList.remove('on'); }
  function openPanel() {
    var cd = root.querySelector('#cd');
    if (state.mode === 'demo' || state.mode === 'cek') {
      cd.innerHTML = '<h2>Aktifkan Lisensi</h2><p>Masukkan kode lisensi (kode akses) dari Nabire Kreatif untuk domain <b>' + esc(host) + '</b>. Cukup <b>sekali</b>; setelah aktif, semua pengunjung situs ini tidak perlu memasukkan kode lagi.</p>' +
        '<form id="f" autocomplete="off"><input id="k" type="text" autocapitalize="characters" spellcheck="false" placeholder="NK-XXXX-XXXX"><div class="er" id="er" role="alert"></div><button class="btn b1" id="go" type="submit">Aktifkan Sekarang</button></form>' +
        '<a class="btn b2" style="margin-top:10px;width:100%;text-align:center" href="' + esc(BELI) + '" target="_blank" rel="noopener">Belum punya kode? Beli di Nabire Kreatif</a><button class="btn b3" id="x" type="button">Tutup</button>';
      kIn = cd.querySelector('#k'); er = cd.querySelector('#er'); goBtn = cd.querySelector('#go');
      cd.querySelector('#f').addEventListener('submit', onSubmit); cd.querySelector('#x').addEventListener('click', closePanel);
      if (state.msg) er.textContent = state.msg;
    } else {
      cd.innerHTML = '<h2>' + (state.mode === 'lisensi' ? 'Lisensi aktif ✓' : 'Mode pengembang') + '</h2><p>' + (state.mode === 'lisensi' ? 'Domain <b>' + esc(host) + '</b> berlisensi. Semua pengunjung dapat membuka halaman ini tanpa kode.' : 'Domain ini tidak memerlukan kode lisensi.') + '</p><a class="btn b2" style="width:100%;text-align:center" href="' + esc(SITUS) + '" target="_blank" rel="noopener">Nabire Kreatif</a><button class="btn b3" id="x" type="button">Tutup</button>';
      cd.querySelector('#x').addEventListener('click', closePanel);
    }
    pn.classList.add('on'); if (kIn && state.mode !== 'lisensi') setTimeout(function () { try { kIn.focus(); } catch (e) { } }, 40);
  }
  function onSubmit(ev) {
    ev.preventDefault(); var kode = kIn.value.trim(); if (kode.length < 6) { er.textContent = 'Masukkan kode lisensi yang valid.'; return; }
    goBtn.disabled = true; goBtn.textContent = 'Memeriksa…'; er.textContent = '';
    verify(kode).then(function (j) {
      if (j && j.success && j.data && j.data.token) return checkToken(j.data.token).then(function (p) {
        if (!p) throw new Error('Token tidak valid. Konfigurasi lisensi pada nk-license.js tidak cocok.');
        put(host, { kode: kode.toUpperCase().replace(/\s+/g, ''), token: j.data.token }); setLic(p); closePanel();
      });
      er.textContent = (j && j.message) || 'Kode ditolak.';
    }).catch(function (e) { er.textContent = e && e.message && e.message !== 'Failed to fetch' ? e.message : 'Tidak dapat terhubung ke server lisensi. Periksa koneksi internet.'; })
      .then(function () { if (goBtn) { goBtn.disabled = false; goBtn.textContent = 'Aktifkan Sekarang'; } });
  }

  function render() { if (W) W.setAttribute('data-m', state.mode === 'dev' || state.mode === 'owner' ? 'lisensi' : state.mode); if (stEl) stEl.textContent = state.mode === 'dev' ? 'Mode pengembang' : state.mode === 'owner' ? 'Domain pemilik' : 'Template berlisensi'; }
  function decide(mode, msg, exp) { if (locked) return; state.mode = mode; state.msg = msg || ''; state.exp = exp || 0; render(); if (!decided) { decided = true; res(snap()); } }

  /* ---------- verifikasi token & server ---------- */
  var keyP = null;
  function pubKey() { if (!keyP) keyP = nat.imp('spki', b64u(C.pub || ''), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']); return keyP; }
  function checkToken(tok) {
    if (!tok || typeof tok !== 'string' || tok.indexOf('.') < 1 || !nat.verify) return Promise.resolve(null);
    var pr = tok.split('.');
    return pubKey().then(function (k) { return nat.verify('RSASSA-PKCS1-v1_5', k, b64u(pr[1]), enc.encode(pr[0])); }).then(function (okSig) {
      if (!okSig) return null;
      var p = JSON.parse(dec.decode(b64u(pr[0])));
      if (p.dom !== host || (C.pid && p.pid !== C.pid) || !p.exp || p.exp < now()) return null;
      return p;
    }).catch(function () { return null; });
  }
  function verify(kode) {
    var ctl = w.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return nat.fetch(C.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'license.verify', data: { kode: kode, domain: host, pid: C.pid || '' } }), redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(tm); return r.json(); });
  }
  var tmr = null;
  function setLic(p) { decide('lisensi', '', p.exp); clearInterval(tmr); tmr = setInterval(function () { recheck(false); }, 30 * 60 * 1000); }
  /* Token segar (<24 jam) diverifikasi offline. Kode kosong = server mengenali domain yang sudah diaktifkan. */
  function recheck(force) {
    var st = get(host) || {};
    return checkToken(st.token).then(function (p) {
      if (p && (now() - p.iat) < DAY && !force) { setLic(p); return; }
      return verify(st.kode || '').then(function (j) {
        if (j && j.success && j.data && j.data.token) return checkToken(j.data.token).then(function (np) { if (np) { put(host, { kode: st.kode || '', token: j.data.token }); setLic(np); } else if (p) setLic(p); else decide('demo', 'Konfigurasi lisensi tidak cocok. Unduh ulang nk-license.js.'); });
        var code = j && j.data && j.data.code, msg = (j && j.message) || '';
        if (code === 'RATE' && p) return setLic(p);
        put(host, null); decide('demo', code === 'NOREG' ? '' : msg);
      }).catch(function () { if (p) setLic(p); else decide('demo', 'Tidak dapat memeriksa lisensi (jaringan).'); });
    });
  }

  /* ---------- penjaga hak cipta ---------- */
  var strikes = 0;
  function guardReason() {
    if (!host_el || !host_el.isConnected || host_el.parentNode !== d.documentElement) return 'hapus';
    if (host_el.getAttribute('style') !== HATTR || Array.prototype.map.call(host_el.attributes, function (a) { return a.name; }).sort().join(',') !== HKEYS) return 'gaya';
    if (!cpA || !cpA.isConnected || cpA.textContent !== COPY || cpA.href !== COPYURL || cpA.getAttribute('href') !== COPYURL) return 'teks';
    if (d.hidden) return '';
    var cs = getComputedStyle(cpA), hs = getComputedStyle(host_el), bs = getComputedStyle(bar), r = cpA.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility !== 'visible' || +cs.opacity < 0.9 || hs.display === 'none' || hs.visibility !== 'visible' || +hs.opacity < 0.9 || bs.display === 'none' || +bs.opacity < 0.5) return 'sembunyi';
    if (r.width < 60 || r.height < 10 || r.bottom < 0 || r.top > w.innerHeight || r.right < 0 || r.left > w.innerWidth) return 'ukuran';
    var el = d.elementFromPoint(Math.min(w.innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(w.innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (el !== host_el) return 'tertutup';
    return '';
  }
  function guard() {
    var why = guardReason();
    if (why === 'hapus' || why === 'gaya' || why === 'teks') return lockdown('Hak cipta Nabire Kreatif pada halaman ini diubah/dihapus.');
    if (why) { if (++strikes >= 2) lockdown('Hak cipta Nabire Kreatif pada halaman ini disembunyikan/ditutup.'); } else strikes = 0;
  }
  function startGuard() {
    setInterval(guard, 1500);
    if (w.MutationObserver) {
      new MutationObserver(function () { guard(); if (locked) assertLock(); }).observe(d.documentElement, { childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      if (host_el) new MutationObserver(guard).observe(host_el, { attributes: true });
    }
    d.addEventListener('visibilitychange', guard);
  }

  /* ---------- segel: berkas template & skrip pelindung tidak boleh diubah ---------- */
  function rootBase() { try { return new URL('.', selfSrc || location.href).href; } catch (e) { return location.href; } }
  function pageKey() { var b = new URL(rootBase()), p = location.pathname; var rel = p.indexOf(b.pathname) === 0 ? p.slice(b.pathname.length) : p.split('/').pop(); return rel === '' || /\/$/.test(rel) ? rel + 'index.html' : rel; }
  function pageSeal(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), o = { s: [], c: [], i: [] };
    [].forEach.call(doc.querySelectorAll('script'), function (s) { var t = (s.getAttribute('type') || '').toLowerCase(); if (t && !/javascript|module/.test(t)) return; if (s.hasAttribute('src')) o.s.push(s.getAttribute('src')); else o.i.push(norm(s.textContent)); });
    [].forEach.call(doc.querySelectorAll('link[rel~=stylesheet]'), function (l) { o.c.push(l.getAttribute('href')); });
    return sha(JSON.stringify(o));
  }
  function integrity() {
    var S = C.seal, base = rootBase(), jobs = [];
    if (S && S.f) S.f.forEach(function (it) { jobs.push(fetchText(new URL(it.u, base).href).then(function (t) { return sha(norm(t)); }).then(function (h) { return h === it.h; }).catch(function () { return true; })); });
    if (S && S.i) { var pk = pageKey(); if (S.i[pk]) jobs.push(fetchText(location.href.split('#')[0].split('?')[0]).then(pageSeal).then(function (h) { return h === S.i[pk]; }).catch(function () { return true; })); }
    if (C.self && selfSrc) jobs.push(fetchText(selfSrc).then(function (t) { var i = t.indexOf('\n'); return sha(norm(i > -1 && /^window\.NKL=/.test(t) ? t.slice(i + 1) : t)); }).then(function (h) { return h === C.self; }).catch(function () { return true; }));
    return Promise.all(jobs).then(function (a) { if (a.some(function (x) { return x === false; })) lockdown('Skrip atau berkas template ini terdeteksi telah diubah.'); });
  }

  /* ---------- penguncian: halaman tidak bereaksi sama sekali ---------- */
  var EVT = ['click', 'dblclick', 'auxclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'submit', 'keydown', 'keyup', 'keypress', 'change', 'input', 'contextmenu', 'dragstart', 'focusin'];
  function killer(e) { if (e.target === lockEl) return; e.stopImmediatePropagation(); e.preventDefault(); }
  function assertLock() {
    if (!lockEl || !lockEl.isConnected) { if (lockEl) d.documentElement.appendChild(lockEl); }
    if (d.body) { d.body.style.setProperty('pointer-events', 'none', 'important'); [].forEach.call(d.body.children, function (c) { if (!c.hasAttribute('inert')) c.setAttribute('inert', ''); }); d.body.setAttribute('aria-hidden', 'true'); }
    if (host_el && host_el.isConnected) host_el.style.setProperty('display', 'none', 'important');
  }
  function lockdown(msg) {
    if (locked) return; locked = true; state.mode = 'kunci'; state.msg = msg; if (!decided) { decided = true; res(snap()); }
    lockEl = d.createElement('div'); lockEl.setAttribute('data-nkl', 'lock'); lockEl.style.cssText = HOST_CSS.replace('pointer-events:none', 'pointer-events:auto');
    lockRoot = lockEl.attachShadow({ mode: OPEN ? 'open' : 'closed' });
    lockRoot.innerHTML = '<style>' + CSS + '</style><div class="lk"><div class="cd"><h2>🔒 Template tidak berlisensi</h2><p>' + esc(msg) + ' Fungsi halaman ini dinonaktifkan.</p><p>Dapatkan lisensi resmi dari Nabire Kreatif untuk menggunakan template ini.</p><a class="btn b1" style="width:100%;text-align:center" href="' + esc(BELI) + '" target="_blank" rel="noopener">Dapatkan / Aktifkan Lisensi</a><p style="margin:14px 0 0;font-size:12px;color:#94a3b8">' + esc(COPY) + ' · nabirekreatif.com</p></div></div>';
    d.documentElement.appendChild(lockEl);
    EVT.forEach(function (n) { w.addEventListener(n, killer, true); d.addEventListener(n, killer, true); });
    assertLock(); setInterval(assertLock, 700);
    if (w.MutationObserver) new MutationObserver(assertLock).observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'style'] });
  }

  /* ---------- mulai ---------- */
  function onReady(fn) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn); else fn(); }
  buildUI();
  /* Menu lisensi: (1) tautan domain.com/#key (landing page), (2) elemen apa pun ber-atribut data-nk-license
   * atau NKLicense.open() (menu "Lisensi" di dasbor template). */
  function keyHash() { if (/^#\/?key\/?$/i.test(location.hash)) { if (d.body) openPanel(); else onReady(openPanel); } }
  w.addEventListener('hashchange', keyHash); keyHash();
  d.addEventListener('click', function (e) { var t = e.target && e.target.closest && e.target.closest('[data-nk-license]'); if (t && !locked) { e.preventDefault(); openPanel(); } });
  if (isDev) { decide('dev'); return; }
  if (isOwner()) { decide('owner'); return; }
  startGuard();
  if (nativeBad) lockdown('Fungsi keamanan browser pada halaman ini telah diubah.');
  if (!subtle || !C.api || !C.pub) { decide('demo', 'Lisensi tidak dapat diperiksa (konfigurasi tidak lengkap atau bukan HTTPS).'); }
  else recheck(false);
  var runInt = function () { setTimeout(function () { integrity().catch(function () { }); }, 600); };
  if (d.readyState === 'complete') runInt(); else w.addEventListener('load', runInt);
  onReady(function () { if (host_el && host_el.parentNode !== d.documentElement) guard(); });
})(window, document);
