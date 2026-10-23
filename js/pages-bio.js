/* Link Bio: halaman publik (https://domain/#nama), editor member (/saya/linkbio), panel admin (/admin/linkbio) */
(function (w) {
  'use strict';
  const N = w.NK, { esc, ic, ACT, FORM, INPUT, route, toast, api, use, S } = N, A = w.NKA;
  const DEF = { bg1: '#FAF7F0', bg2: '#FFFFFF', teks: '#1A1A1A', tombol: '#1F2933', teks_tombol: '#FFFFFF', aksen: '#B8860B', gaya: 'bulat' };
  const MAX = 6, MAXT = 5;
  const PRESET = [
    ['Resto Emas', { bg1: '#FAF7F0', bg2: '#FFFFFF', teks: '#1A1A1A', tombol: '#1F2933', teks_tombol: '#FFFFFF', aksen: '#B8860B' }],
    ['Samudra', { bg1: '#F1F7FB', bg2: '#FFFFFF', teks: '#0B2A44', tombol: '#0A4C7A', teks_tombol: '#FFFFFF', aksen: '#F28500' }],
    ['Hutan', { bg1: '#F3F7F1', bg2: '#FFFFFF', teks: '#14291C', tombol: '#14532D', teks_tombol: '#FFFFFF', aksen: '#CA8A04' }],
    ['Senja', { bg1: '#FFF6EE', bg2: '#FFFFFF', teks: '#431407', tombol: '#9A3412', teks_tombol: '#FFFFFF', aksen: '#EA580C' }],
    ['Ungu', { bg1: '#F5F3FF', bg2: '#FFFFFF', teks: '#1E1B4B', tombol: '#5B21B6', teks_tombol: '#FFFFFF', aksen: '#C026D3' }],
    ['Malam', { bg1: '#111827', bg2: '#1F2937', teks: '#F9FAFB', tombol: '#F59E0B', teks_tombol: '#111827', aksen: '#FBBF24' }]
  ];
  const GAYA = [['bulat', 'Bulat'], ['lembut', 'Lembut'], ['kotak', 'Kotak']];
  const SOS = [['facebook', 'Facebook', 'username atau link'], ['instagram', 'Instagram', '@username'], ['youtube', 'YouTube', '@channel atau link'], ['tiktok', 'TikTok', '@username'], ['whatsapp', 'WhatsApp', '0812 3456 7890'], ['website', 'Website', 'https://tokosaya.com'], ['email', 'Email', 'nama@email.com']];
  const IKON = [['link', 'Tautan'], ['globe', 'Website'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['whatsapp', 'WhatsApp'], ['mail', 'Email'], ['store', 'Toko / Market'], ['music', 'Musik'], ['map', 'Lokasi']];
  const IC = { store: 'cart', music: 'play', map: 'pin', website: 'globe', email: 'mail' };
  const icn = (k, s) => ic(IC[k] || k, s);
  const PESAN_DEF = 'Halo {nama}, saya ingin memesan *{produk}* ({harga}).\n\nFoto produk: {gambar}';
  const hexOk = v => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
  const okHref = u => /^(https?:\/\/|mailto:)/i.test(String(u || '')) ? String(u) : '';
  const BIO = { draft: null, init: false, dirty: false, err: {}, tab: 'edit', saving: false };
  const themeOf = t => { const o = Object.assign({}, DEF, t || {}); ['bg1', 'bg2', 'teks', 'tombol', 'teks_tombol', 'aksen'].forEach(k => { if (!hexOk(o[k])) o[k] = DEF[k]; }); if (!GAYA.some(g => g[0] === o.gaya)) o.gaya = 'bulat'; return o; };

  /* ---- Pesan WhatsApp: nomor, templat, tautan pesan (dipakai juga oleh pratinjau) ---- */
  function waNum(v) {
    let d = String(v.wa || v.wa_pesan || '').replace(/\D/g, '');
    if (!d) d = String((v.sosial || {}).whatsapp || '').replace(/^.*wa\.me\//, '').replace(/\D/g, '');
    if (d[0] === '0') d = '62' + d.slice(1); else if (d[0] === '8') d = '62' + d;
    return d;
  }
  function waText(v, l) {
    const tpl = String(l.pesan || v.pesan || PESAN_DEF), img = okHref(l.gambar);
    const val = { nama: v.nama || '', produk: l.judul || '', harga: l.harga || '', gambar: img };
    const hadImg = /\{gambar\}/.test(tpl);
    let out = tpl.split('\n').map(line => /\{gambar\}/.test(line) && !img ? null : line.replace(/\{(nama|produk|harga|gambar)\}/g, (m, k) => val[k])).filter(x => x !== null).join('\n').replace(/\(\s*\)/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (img && !hadImg) out += '\n\nFoto produk: ' + img;
    return out;
  }
  function orderHref(v, l) {
    const c = okHref(l.url); if (c) return c;
    const n = waNum(v); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(waText(v, l)) : '';
  }

  /* ======================= RENDERER (dipakai halaman publik & pratinjau) ======================= */
  const WAVE = '<svg class="bio-wave" viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true"><path d="M0 26C40 6 80 6 130 22s90 24 140 8 80-22 130-6V44H0Z" fill="var(--bg1)"/></svg>';
  function bioPage(v, pv) {
    const t = themeOf(v.tema), sos = v.sosial || {}, links = (v.links || []).filter(l => l && l.aktif !== false && l.judul);
    const style = '--bg1:' + t.bg1 + ';--bg2:' + t.bg2 + ';--tx:' + t.teks + ';--bt:' + t.tombol + ';--btx:' + t.teks_tombol + ';--ak:' + t.aksen;
    const av = okHref(v.avatar), cv = okHref(v.cover), name = v.nama || 'Nama Anda';
    let i = 0; const st = () => 'style="--i:' + (i++) + '"';
    const pill = (href, label, icon) => '<a class="bio-btn" ' + st() + ' href="' + esc(href) + '" target="_blank" rel="noopener noreferrer nofollow">' + icn(icon) + '<span>' + esc(label) + '</span>' + ic('arrow', 'sm') + '</a>';
    const btns = SOS.filter(s => okHref(sos[s[0]])).map(s => pill(okHref(sos[s[0]]), s[1], s[0])).concat((v.tautan || []).filter(x => x && x.label && okHref(x.url)).map(x => pill(okHref(x.url), x.label, x.ikon || 'link'))).join('');
    const prod = links.map(l => {
      const h = orderHref(v, l), img = okHref(l.gambar);
      return '<a class="bio-p" href="' + esc(h || '#') + '" target="_blank" rel="noopener noreferrer nofollow">' + '<div class="bio-pi">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : ic('image')) + '</div><div class="bio-pb"><b>' + esc(l.judul) + '</b>' + (l.deskripsi ? '<small>' + esc(l.deskripsi) + '</small>' : '') + '<div class="bio-pr2">' + (l.harga ? '<em>' + esc(l.harga) + '</em>' : '<em></em>') + '<span class="bio-go" aria-hidden="true">' + (l.url ? ic('arrow', 'sm') : ic('whatsapp', 'sm')) + '</span></div></div></a>';
    }).join('');
    const q = [v.alamat, v.kota].filter(Boolean).join(', '), mapsHref = okHref(v.maps) || (q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '');
    const loc = (v.alamat || v.maps) ? '<section class="bio-sec bio-loc" ' + st() + '><h2>Lokasi Kami</h2><div class="bio-card">' + (v.alamat ? '<p class="bio-addr">' + ic('pin', 'sm') + '<span>' + esc(v.alamat) + '</span></p>' : '') +
      (mapsHref ? '<a class="bio-btn ak" href="' + esc(mapsHref) + '" target="_blank" rel="noopener noreferrer">' + ic('pin') + '<span>Lihat di Google Maps</span>' + ic('arrow', 'sm') + '</a>' : '') +
      (q ? '<div class="bio-map">' + (pv ? '<div class="bio-mapph">' + ic('pin', 'lg') + '</div>' : '<iframe title="Peta lokasi" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed"></iframe>') + '</div>' : '') + '</div></section>' : '';
    return '<div class="bio ' + (pv ? 'pv' : '') + '" data-g="' + t.gaya + '" style="' + style + '"><div class="bio-w">' +
      '<header class="bio-hd"><div class="bio-cv" ' + (cv ? 'style="background-image:url(\'' + esc(cv) + '\')"' : '') + '>' + WAVE + '</div>' +
      '<div class="bio-av" ' + st() + '>' + (av ? '<img src="' + esc(av) + '" alt="">' : '<span>' + esc(N.initials(name)) + '</span>') + '</div>' +
      '<h1 class="bio-n" ' + st() + '>' + esc(name) + '</h1>' + (v.kota ? '<div class="bio-k" ' + st() + '>' + ic('pin', 'sm') + esc(v.kota) + '</div>' : '') + (v.bio ? '<p class="bio-b" ' + st() + '>' + esc(v.bio) + '</p>' : '') + '</header>' +
      (btns ? '<nav class="bio-bs">' + btns + '</nav>' : '') +
      '<section class="bio-sec bio-prods" ' + st() + '><div class="bio-sh"><h2>' + esc(v.judul_produk || 'Produk Favorit') + '</h2>' + (links.length > 2 ? '<button type="button" class="bio-all" data-act="bio-all">Lihat Semua</button>' : '') + '</div>' +
      '<div class="bio-car">' + (prod || '<div class="bio-empty">Belum ada produk.</div>') + '</div></section>' + loc +
      '<footer class="bio-ft" ' + st() + '><div class="bio-ty">Terima Kasih</div><p>' + esc(v.terima_kasih || 'Terima kasih sudah berkunjung.') + '</p><small>Dibuat dengan <a href="#/katalog">' + esc(N.appName()) + '</a></small></footer></div></div>';
  }
  ACT['bio-all'] = el => { const s = el.closest('.bio-prods'); if (!s) return; const on = s.classList.toggle('all'); el.textContent = on ? 'Ringkas' : 'Lihat Semua'; };

  /* ======================= HALAMAN PUBLIK ======================= */
  const bare = inner => '<div class="bio" style="--bg1:#FAF7F0;--bg2:#fff;--tx:#1A1A1A;--bt:#1F2933;--btx:#fff;--ak:#B8860B" data-g="bulat"><div class="bio-w" style="justify-content:center;min-height:70vh;padding:24px">' + inner + '</div></div>';
  const notFound = msg => bare('<div class="bio-av" style="margin:0 auto"><span>?</span></div><h1 class="bio-n" style="text-align:center">Halaman tidak ditemukan</h1><p class="bio-b" style="text-align:center">' + esc(msg || 'Link Bio ini tidak ada atau sedang offline.') + '</p><a class="bio-btn" href="#/"><span>Ke Beranda ' + esc(N.appName()) + '</span></a>');
  route(/^\/@([\w.\-]+)$/, {
    layout: 'bare', title: m => '@' + m[1],
    render(m) {
      const slug = m[1].toLowerCase(), key = 'bio:' + slug;
      const v = use(key, { scope: 'pub', ttl: 60000, onFail: r => { BIO.err[slug] = (r && r.message) || 'Gagal memuat.'; if (r && r.data && r.data.code === 'NOTFOUND') N.sset('pub', key, null); N.softRender(); } });
      if (v) return bioPage(v);
      if (v === null) return notFound(BIO.err[slug]);
      if (!S.gas) return notFound('Backend belum tersambung (isi GAS_URL di js/config.js).');
      if (BIO.err[slug]) return notFound(BIO.err[slug]);
      return bare('<div class="sk-l" style="height:150px;border-radius:0;margin:-24px -24px 0"></div><div class="bio-av sk-l" style="margin:-48px auto 0"></div><div class="sk-l" style="height:22px;width:180px;margin:12px auto"></div><div class="sk-l" style="height:48px;margin-top:14px"></div><div class="sk-l" style="height:48px;margin-top:10px"></div>');
    },
    mount(root, m) {
      const e = N.sget('pub', 'bio:' + m[1].toLowerCase()), v = e && e.v, t = themeOf(v && v.tema);
      document.body.style.background = 'color-mix(in srgb,' + t.tombol + ' 14%,#ffffff)';
      if (v) document.title = v.nama + ' · Link Bio';
      let mt = document.querySelector('meta[name=theme-color]'); if (!mt) { mt = document.createElement('meta'); mt.name = 'theme-color'; document.head.appendChild(mt); } mt.content = t.bg1;
    }
  });

  /* ======================= EDITOR MEMBER ======================= */
  const inI = (label, k, o) => '<div class="fg"><label class="fl" for="bf-' + k + '">' + label + '</label><input class="in ' + ((o && o.mono) ? 'mono' : '') + '" id="bf-' + k + '" data-input="bio-f" data-k="' + k + '" value="' + esc(BIO.draft[k] || '') + '" ' + ((o && o.ph) ? 'placeholder="' + esc(o.ph) + '"' : '') + ' ' + ((o && o.max) ? 'maxlength="' + o.max + '"' : '') + ' ' + ((o && o.inp) ? 'inputmode="' + o.inp + '"' : '') + ' autocomplete="off">' + ((o && o.hint) ? '<div class="hint">' + o.hint + '</div>' : '') + '</div>';
  function themeHTML() {
    const t = themeOf(BIO.draft.tema), cp = (k, l) => '<label class="cpk"><input type="color" value="' + t[k] + '" data-input="bio-c" data-k="' + k + '"><span>' + l + '<small class="mono">' + t[k] + '</small></span></label>';
    return '<div class="bio-presets">' + PRESET.map((p, i) => '<button type="button" class="bio-pr" data-act="bio-preset" data-i="' + i + '" style="background:' + p[1].bg1 + ';color:' + p[1].teks + ';text-shadow:none;border:1px solid rgba(0,0,0,.12)" aria-label="Tema ' + p[0] + '"><i style="background:' + p[1].tombol + '"></i><u style="background:' + p[1].aksen + '"></u><span>' + p[0] + '</span></button>').join('') + '</div>' +
      '<div class="cpg">' + cp('bg1', 'Latar halaman') + cp('bg2', 'Latar kartu') + cp('teks', 'Warna teks') + cp('tombol', 'Tombol & penutup') + cp('teks_tombol', 'Teks tombol') + cp('aksen', 'Aksen (harga, ikon)') + '</div>' +
      '<label class="fl" style="margin-top:12px">Bentuk tombol</label><div class="tabs">' + GAYA.map(g => '<button type="button" class="tab ' + (t.gaya === g[0] ? 'on' : '') + '" data-act="bio-gaya" data-v="' + g[0] + '">' + g[1] + '</button>').join('') + '</div>';
  }
  function tautanHTML() {
    const T = BIO.draft.tautan;
    return T.map((x, i) => '<div class="bio-tr"><select class="in" data-input="bio-t" data-i="' + i + '" data-k="ikon" aria-label="Ikon">' + IKON.map(k => '<option value="' + k[0] + '" ' + (x.ikon === k[0] ? 'selected' : '') + '>' + k[1] + '</option>').join('') + '</select><input class="in" placeholder="Nama tombol (mis. Spotify)" maxlength="30" data-input="bio-t" data-i="' + i + '" data-k="label" value="' + esc(x.label || '') + '"><input class="in" inputmode="url" autocapitalize="off" placeholder="https://…" data-input="bio-t" data-i="' + i + '" data-k="url" value="' + esc(x.url || '') + '"><button type="button" class="btn danger xs" data-act="bio-t-del" data-i="' + i + '" aria-label="Hapus">' + ic('x', 'sm') + '</button></div>').join('') +
      (T.length < MAXT ? '<button type="button" class="btn soft block" data-act="bio-t-add">' + ic('plus', 'sm') + 'Tambah tombol tautan (' + T.length + '/' + MAXT + ')</button>' : '');
  }
  function linkHTML(l, i, n) {
    return '<div class="card flat bio-lc" data-i="' + i + '"><div class="row between" style="margin-bottom:8px"><b class="small">Produk ' + (i + 1) + '</b><div class="row" style="gap:4px">' + A.switchH(l.aktif !== false, 'data-change="bio-l-on" data-i="' + i + '" aria-label="Tampilkan"') + '<button type="button" class="btn ghost xs" data-act="bio-l-mv" data-i="' + i + '" data-d="-1" ' + (i === 0 ? 'disabled' : '') + ' aria-label="Naik">' + ic('arrowup', 'sm') + '</button><button type="button" class="btn ghost xs" data-act="bio-l-mv" data-i="' + i + '" data-d="1" ' + (i === n - 1 ? 'disabled' : '') + ' aria-label="Turun">' + ic('arrowdown', 'sm') + '</button><button type="button" class="btn danger xs" data-act="bio-l-del" data-i="' + i + '" aria-label="Hapus">' + ic('x', 'sm') + '</button></div></div>' +
      '<div class="bio-lg"><div>' + N.imgField({ value: l.gambar, kind: 'bio', api: 'bio.upload', max: 700, small: true, attrs: 'data-input="bio-l" data-i="' + i + '" data-k="gambar"' }) + '</div><div>' +
      '<input class="in" placeholder="Nama produk / menu *" maxlength="60" data-input="bio-l" data-i="' + i + '" data-k="judul" value="' + esc(l.judul || '') + '">' +
      '<div class="grid2" style="margin-top:8px"><input class="in" placeholder="Harga (mis. Rp 25.000)" maxlength="30" data-input="bio-l" data-i="' + i + '" data-k="harga" value="' + esc(l.harga || '') + '"><input class="in" placeholder="Keterangan singkat" maxlength="120" data-input="bio-l" data-i="' + i + '" data-k="deskripsi" value="' + esc(l.deskripsi || '') + '"></div>' +
      '<details class="bio-adv"' + ((l.url || l.pesan) ? ' open' : '') + '><summary>Pengaturan pesanan produk ini (opsional)</summary><input class="in" inputmode="url" autocapitalize="off" placeholder="Link tujuan lain (kosongkan = pesan lewat WhatsApp)" data-input="bio-l" data-i="' + i + '" data-k="url" value="' + esc(l.url || '') + '"><textarea class="in" style="margin-top:8px" maxlength="300" placeholder="Pesan WhatsApp khusus produk ini (kosongkan = pakai pesan umum)" data-input="bio-l" data-i="' + i + '" data-k="pesan">' + esc(l.pesan || '') + '</textarea></details></div></div></div>';
  }
  function linksHTML() {
    const L = BIO.draft.links;
    return L.map((l, i) => linkHTML(l, i, L.length)).join('') + (L.length < MAX ? '<button type="button" class="btn soft block" data-act="bio-l-add">' + ic('plus', 'sm') + 'Tambah produk (' + L.length + '/' + MAX + ')</button>' : '<div class="alert info">' + ic('info') + '<span>Batas maksimal ' + MAX + ' produk sudah tercapai.</span></div>');
  }
  const blank = () => ({ slug: '', nama: '', bio: '', avatar: '', cover: '', kota: '', alamat: '', maps: '', wa_pesan: '', pesan: '', judul_produk: '', terima_kasih: '', tema: Object.assign({}, DEF), sosial: {}, tautan: [], links: [], online: true });
  function initDraft(d) {
    const p = d.page, s = d.saran || {};
    BIO.draft = p ? Object.assign(blank(), { slug: p.slug, nama: p.nama, bio: p.bio, avatar: p.avatar, cover: p.cover || '', kota: p.kota || '', alamat: p.alamat || '', maps: p.maps || '', wa_pesan: p.wa_pesan || '', pesan: p.pesan || '', judul_produk: p.judul_produk || '', terima_kasih: p.terima_kasih || '', tema: themeOf(p.tema), sosial: Object.assign({}, p.sosial), tautan: (p.tautan || []).map(x => Object.assign({}, x)), links: (p.links || []).map(l => Object.assign({}, l)), online: p.online !== false })
      : Object.assign(blank(), { slug: s.slug || '', nama: s.nama || '' });
    BIO.init = true; BIO.dirty = false; BIO.oldSlug = p ? p.slug : '';
  }
  const pvHTML = () => bioPage(BIO.draft, true);
  function urlLine() { const s = BIO.draft.slug; return N.shareUrl(s || 'namaanda'); }
  function pvUpdate() { const el = N.$('#bio-pv'); if (el) { const sc = el.firstElementChild ? el.firstElementChild.scrollTop : 0; el.innerHTML = pvHTML(); if (el.firstElementChild) el.firstElementChild.scrollTop = sc; } const u = N.$('#bio-url'); if (u) u.textContent = urlLine(); markDirty(); }
  function markDirty() { BIO.dirty = true; const b = N.$('#bio-save'); if (b) { b.disabled = false; b.classList.add('pri'); } const dn = N.$('#bio-dirty'); if (dn) dn.style.display = ''; }
  function editorHTML(d) {
    const dr = BIO.draft, saved = !!d.page;
    const share = '<div class="card bio-share"><div class="row between wrap" style="gap:12px"><div class="grow" style="min-width:220px"><div class="eyebrow">Link Anda</div><div class="bio-url mono" id="bio-url">' + esc(urlLine()) + '</div><div class="hint">' + (saved ? 'Bagikan link ini di bio Instagram/TikTok, WhatsApp, atau kartu nama.' : 'Simpan dulu agar link aktif dan bisa dibagikan.') + '</div></div><div class="row wrap">' +
      '<button type="button" class="btn soft sm" data-act="bio-copy">' + ic('copy', 'sm') + 'Salin</button>' + (saved ? '<a class="btn nav sm" id="bio-open" href="#' + esc(d.page.slug) + '" target="_blank" rel="noopener">' + ic('ext', 'sm') + 'Buka</a><a class="btn wa sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Lihat Link Bio saya: ' + N.shareUrl(d.page.slug)) + '">' + ic('whatsapp', 'sm') + 'WA</a>' : '') + '</div></div>' +
      '<div class="row" style="margin-top:12px;gap:12px;align-items:center"><label class="sw"><input type="checkbox" ' + (dr.online ? 'checked' : '') + ' data-change="bio-online"><i></i></label><div><b>Halaman online</b><div class="hint" style="margin:0">Matikan untuk menyembunyikan halaman sementara (link tetap milik Anda).</div></div></div></div>';
    const blocked = d.page && d.page.blokir ? '<div class="alert err" style="margin-bottom:14px">' + ic('alert') + '<span>Halaman Anda dinonaktifkan oleh admin. Hubungi admin untuk membukanya.</span></div>' : '';
    const off = d.aktif_global === false ? '<div class="alert warn" style="margin-bottom:14px">' + ic('alert') + '<span>Fitur Link Bio sedang dinonaktifkan sementara oleh admin; halaman publik belum bisa dibuka.</span></div>' : '';
    const sosH = SOS.map(s => '<div class="fg"><label class="fl" for="bs-' + s[0] + '">' + icn(s[0], 'sm') + ' ' + s[1] + '</label><input class="in" id="bs-' + s[0] + '" data-input="bio-s" data-k="' + s[0] + '" value="' + esc(dr.sosial[s[0]] || '') + '" placeholder="' + esc(s[2]) + '" autocapitalize="off" spellcheck="false"></div>').join('');
    const chips = ['nama', 'produk', 'harga', 'gambar'].map(k => '<button type="button" class="chip" data-act="bio-ph" data-v="{' + k + '}">{' + k + '}</button>').join('');
    const edit = share +
      '<div class="card"><h3>Profil</h3><div class="bio-prof mt"><div>' + N.imgField({ value: dr.avatar, kind: 'bio', api: 'bio.upload', max: 600, round: true, attrs: 'data-input="bio-f" data-k="avatar"', hint: 'Logo / foto profil' }) + '</div><div>' + inI('Nama usaha / tampilan *', 'nama', { max: 60, ph: 'Nama usaha / nama Anda' }) + inI('Kota / lokasi singkat', 'kota', { max: 60, ph: 'Nabire, Papua Tengah' }) + '</div></div>' +
      '<div class="fg"><label class="fl">Foto sampul (banner atas)</label>' + N.imgField({ value: dr.cover, kind: 'bio', api: 'bio.upload', max: 1400, attrs: 'data-input="bio-f" data-k="cover"', hint: 'Disarankan foto lebar (3:2). Bagian bawah otomatis bergelombang.' }) + '</div>' +
      '<div class="fg"><label class="fl" for="bf-bio">Deskripsi singkat <small class="muted" id="bio-cnt">' + (dr.bio || '').length + '/240</small></label><textarea class="in" id="bf-bio" maxlength="240" data-input="bio-f" data-k="bio" placeholder="Ceritakan usaha Anda dalam 1–2 kalimat">' + esc(dr.bio || '') + '</textarea></div>' +
      '<div class="fg"><label class="fl" for="bf-slug">Nama link *</label><div class="slugf"><span class="mono">' + esc((location.host || 'domain-anda') + '/#') + '</span><input class="in mono" id="bf-slug" data-input="bio-f" data-k="slug" value="' + esc(dr.slug) + '" maxlength="30" autocapitalize="off" spellcheck="false" placeholder="namaanda"></div><div class="hint">3–30 karakter: huruf kecil, angka, titik, strip. Jika diganti, link lama tidak berlaku lagi.</div></div></div>' +
      '<div class="card"><h3>Tampilan</h3><p class="small muted">Pilih tema siap pakai (mis. “Resto Emas”), lalu sesuaikan warnanya.</p><div id="bio-theme" class="mt">' + themeHTML() + '</div></div>' +
      '<div class="card"><h3>Tombol Media Sosial</h3><p class="small muted">Cukup isi username atau nomor — tombol dibuat otomatis. Yang kosong tidak ditampilkan.</p><div class="grid2 mt">' + sosH + '</div>' +
      '<h4 style="margin:14px 0 6px">Tombol tautan lain <span class="pill" id="bio-tcnt">' + dr.tautan.length + '/' + MAXT + '</span></h4><p class="small muted">Contoh: Spotify, Market Place, Menu PDF, Reservasi.</p><div class="col" id="bio-tl" style="gap:8px">' + tautanHTML() + '</div></div>' +
      '<div class="card"><h3>Pemesanan via WhatsApp</h3><p class="small muted">Klik produk di halaman Anda langsung membuka WhatsApp ke nomor ini dengan pesan di bawah. Link foto produk otomatis ikut terkirim.</p>' +
      inI('Nomor WhatsApp pemesanan', 'wa_pesan', { ph: '0812 3456 7890', inp: 'tel', max: 20, hint: 'Kosongkan bila memakai nomor WhatsApp dari media sosial di atas.' }) +
      '<div class="fg"><label class="fl" for="bf-pesan">Isi pesan <small class="muted">kosongkan = pesan bawaan</small></label><textarea class="in" id="bf-pesan" rows="4" maxlength="300" data-input="bio-f" data-k="pesan" placeholder="' + esc(PESAN_DEF) + '">' + esc(dr.pesan || '') + '</textarea><div class="row wrap" style="gap:6px;margin-top:6px"><small class="muted">Sisipkan:</small>' + chips + '</div><div class="hint">Jika {gambar} tidak ditulis, link foto tetap ditambahkan di akhir pesan.</div></div>' +
      '<div class="bio-wapv"><b class="small">Contoh pesan terkirim</b><pre id="bio-wapv"></pre></div></div>' +
      '<div class="card"><div class="row between"><h3>Produk / Menu</h3><span class="pill" id="bio-lcnt">' + dr.links.length + '/' + MAX + '</span></div><p class="small muted">Maksimal ' + MAX + ' produk. Tampil sebagai karosel “' + esc(dr.judul_produk || 'Produk Favorit') + '”.</p>' + inI('Judul bagian produk', 'judul_produk', { max: 40, ph: 'Produk Favorit (mis. Menu Favorit)' }) + '<div class="col mt" id="bio-links" style="gap:12px">' + linksHTML() + '</div></div>' +
      '<div class="card"><h3>Lokasi</h3>' + inI('Alamat lengkap', 'alamat', { max: 160, ph: 'Jl. Jenderal Sudirman No. 123, Nabire' }) + inI('Link Google Maps', 'maps', { ph: 'https://maps.app.goo.gl/…', inp: 'url', hint: 'Buka Google Maps → Bagikan → Salin link. Kosong = dibuat otomatis dari alamat. Peta tampil bila alamat/kota diisi.' }) + '</div>' +
      '<div class="card"><h3>Penutup</h3>' + inI('Kalimat “Terima Kasih”', 'terima_kasih', { max: 80, ph: 'Terima kasih sudah menjadi bagian dari cerita kami' }) + '</div>';
    const phone = '<div class="phone"><div class="phone-in" id="bio-pv">' + pvHTML() + '</div></div>';
    return A.head('Produk saya', 'Link Bio Saya', 'Atur halaman profil + produk Anda. Perubahan langsung terlihat di pratinjau.', '<span class="pill warn" id="bio-dirty" style="display:none">Belum disimpan</span><button class="btn ' + (BIO.dirty ? 'pri' : 'soft') + '" id="bio-save" data-act="bio-save" ' + (BIO.dirty || !saved ? '' : 'disabled') + '>' + ic('check', 'sm') + 'Simpan Perubahan</button>') + blocked + off +
      '<div class="bio-tabs tabs"><button type="button" class="tab ' + (BIO.tab === 'edit' ? 'on' : '') + '" data-act="bio-tab" data-v="edit">Edit</button><button type="button" class="tab ' + (BIO.tab === 'pv' ? 'on' : '') + '" data-act="bio-tab" data-v="pv">Pratinjau</button></div>' +
      '<div class="bio-ed" data-tab="' + BIO.tab + '"><div class="bio-ed-l col" style="gap:16px">' + edit + '<button class="btn pri block" data-act="bio-save">' + ic('check', 'sm') + 'Simpan Perubahan</button></div><div class="bio-ed-r"><div class="bio-sticky"><div class="eyebrow" style="margin-bottom:8px">Pratinjau langsung</div>' + phone + '</div></div></div>';
  }
  route(/^\/saya\/linkbio$/, {
    layout: 'mem', auth: 'member', title: 'Link Bio Saya',
    enter() { if (!BIO.dirty) BIO.init = false; },
    mount() { waPv(); },
    render() {
      const d = use('bio.me', { ttl: 20000 });
      if (!d) return A.head('Produk saya', 'Link Bio Saya', '') + A.skelBox(260);
      if (!d.allowed) {
        const pr = d.produk;
        return A.head('Produk saya', 'Link Bio Saya', 'Halaman profil + produk, siap dibagikan di bio Instagram/TikTok.') +
          '<div class="card empty" style="padding:34px">' + ic('link', 'lg') + '<h3 style="margin-top:10px">Anda belum memiliki produk Link Bio</h3><p class="muted" style="max-width:480px;margin:8px auto 0">Dapatkan template Link Bio: banner, logo, tombol media sosial, karosel produk yang langsung memesan lewat WhatsApp, dan peta lokasi. Dibagikan lewat link pendek di domain ini.</p><div class="row wrap" style="justify-content:center;margin-top:18px">' + (pr ? '<a class="btn pri" href="#/produk/' + esc(pr.id) + '">' + ic('cart', 'sm') + 'Lihat Produk Link Bio</a>' : '') + '<a class="btn soft" href="#/saya/klaim">' + ic('key', 'sm') + 'Punya kode akses? Klaim</a></div></div>';
      }
      if (!BIO.init) initDraft(d);
      return editorHTML(d);
    }
  });
  function waPv() { const el = N.$('#bio-wapv'); if (!el || !BIO.draft) return; const l = BIO.draft.links.find(x => x.judul) || { judul: 'Nasi Ayam Bakar', harga: 'Rp 25.000', gambar: 'https://lh3.googleusercontent.com/d/CONTOH' }; el.textContent = waText(BIO.draft, l); }
  INPUT['bio-f'] = el => {
    const k = el.getAttribute('data-k'); let v = el.value;
    if (k === 'slug') { const c = v.toLowerCase().replace(/^[#@]+/, '').replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, ''); if (c !== v) { el.value = c; v = c; } }
    BIO.draft[k] = v; if (k === 'bio') { const c = N.$('#bio-cnt'); if (c) c.textContent = v.length + '/240'; } pvUpdate(); waPv();
  };
  INPUT['bio-s'] = el => { BIO.draft.sosial[el.getAttribute('data-k')] = el.value; pvUpdate(); waPv(); };
  INPUT['bio-c'] = el => { BIO.draft.tema[el.getAttribute('data-k')] = el.value.toUpperCase(); const sm = el.parentElement.querySelector('small'); if (sm) sm.textContent = el.value.toUpperCase(); pvUpdate(); };
  INPUT['bio-l'] = el => { const l = BIO.draft.links[+el.getAttribute('data-i')]; if (l) { l[el.getAttribute('data-k')] = el.value; pvUpdate(); waPv(); } };
  INPUT['bio-t'] = el => { const x = BIO.draft.tautan[+el.getAttribute('data-i')]; if (x) { x[el.getAttribute('data-k')] = el.value; pvUpdate(); } };
  INPUT['bio-l-on'] = el => { const l = BIO.draft.links[+el.getAttribute('data-i')]; if (l) { l.aktif = el.checked; pvUpdate(); } };
  INPUT['bio-online'] = el => { BIO.draft.online = el.checked; markDirty(); };
  const relinks = () => { const el = N.$('#bio-links'); if (el) el.innerHTML = linksHTML(); const pill = N.$('#bio-lcnt'); if (pill) pill.textContent = BIO.draft.links.length + '/' + MAX; pvUpdate(); waPv(); };
  const retl = () => { const el = N.$('#bio-tl'); if (el) el.innerHTML = tautanHTML(); const pill = N.$('#bio-tcnt'); if (pill) pill.textContent = BIO.draft.tautan.length + '/' + MAXT; pvUpdate(); };
  ACT['bio-l-add'] = () => { if (BIO.draft.links.length >= MAX) return toast('Maksimal ' + MAX + ' produk.', 'err'); BIO.draft.links.push({ judul: '', url: '', harga: '', deskripsi: '', gambar: '', pesan: '', aktif: true }); relinks(); };
  ACT['bio-l-del'] = el => { BIO.draft.links.splice(+el.getAttribute('data-i'), 1); relinks(); };
  ACT['bio-l-mv'] = el => { const i = +el.getAttribute('data-i'), j = i + (+el.getAttribute('data-d')), L = BIO.draft.links; if (j < 0 || j >= L.length) return; const t = L[i]; L[i] = L[j]; L[j] = t; relinks(); };
  ACT['bio-t-add'] = () => { if (BIO.draft.tautan.length >= MAXT) return toast('Maksimal ' + MAXT + ' tombol.', 'err'); BIO.draft.tautan.push({ label: '', url: '', ikon: 'link' }); retl(); };
  ACT['bio-t-del'] = el => { BIO.draft.tautan.splice(+el.getAttribute('data-i'), 1); retl(); };
  ACT['bio-ph'] = el => { const ta = N.$('#bf-pesan'); if (!ta) return; const v = el.getAttribute('data-v'), a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd; ta.value = (ta.value.slice(0, a) + v + ta.value.slice(b)).slice(0, 300); const p = Math.min(a + v.length, ta.value.length); ta.focus(); ta.setSelectionRange(p, p); BIO.draft.pesan = ta.value; pvUpdate(); waPv(); };
  ACT['bio-preset'] = el => { Object.assign(BIO.draft.tema, PRESET[+el.getAttribute('data-i')][1]); const t = N.$('#bio-theme'); if (t) t.innerHTML = themeHTML(); pvUpdate(); };
  ACT['bio-gaya'] = el => { BIO.draft.tema.gaya = el.getAttribute('data-v'); const t = N.$('#bio-theme'); if (t) t.innerHTML = themeHTML(); pvUpdate(); };
  ACT['bio-tab'] = el => { BIO.tab = el.getAttribute('data-v'); const ed = N.$('.bio-ed'); if (ed) ed.setAttribute('data-tab', BIO.tab); N.$$('.bio-tabs .tab').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === BIO.tab)); w.scrollTo(0, 0); };
  ACT['bio-copy'] = () => N.copy(urlLine());
  ACT['bio-save'] = async el => {
    if (BIO.saving) return; const d = BIO.draft;
    if (!String(d.nama || '').trim()) return toast('Isi nama usaha / tampilan terlebih dahulu.', 'err');
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(d.slug || '')) return toast('Nama link 3–30 karakter: huruf kecil, angka, titik, strip.', 'err');
    for (let i = 0; i < d.tautan.length; i++) { const x = d.tautan[i]; if ((x.label || x.url) && (!String(x.label || '').trim() || !String(x.url || '').trim())) return toast('Lengkapi nama dan link pada tombol tautan ' + (i + 1) + '.', 'err'); }
    d.tautan = d.tautan.filter(x => x.label || x.url);
    for (let i = 0; i < d.links.length; i++) { const l = d.links[i]; if (l.url && !String(l.judul || '').trim()) return toast('Isi nama produk ' + (i + 1) + '.', 'err'); }
    d.links = d.links.filter(l => String(l.judul || '').trim() || l.url);
    if (d.links.some(l => !l.url) && !waNum(d)) return toast('Isi nomor WhatsApp pemesanan agar produk bisa dipesan.', 'err', 5000);
    BIO.saving = true; N.busy(el, true);
    const r = await api('bio.save', d);
    BIO.saving = false; N.busy(el, false);
    if (!r.success) return toast(r.message || 'Gagal menyimpan.', 'err', 6000);
    const cur = N.sget('u', 'bio.me'); N.sset('u', 'bio.me', Object.assign({}, cur ? cur.v : {}, { allowed: true, page: r.data }));
    N.stale('pub', 'bio:' + r.data.slug); if (BIO.oldSlug && BIO.oldSlug !== r.data.slug) N.stale('pub', 'bio:' + BIO.oldSlug); BIO.oldSlug = r.data.slug;
    BIO.dirty = false; BIO.init = false; toast('Link Bio tersimpan 🎉', 'ok'); N.emit('ubio.me');
  };

  /* ======================= PANEL ADMIN ======================= */
  const pillS = r => r.blokir ? '<span class="pill err">Diblokir</span>' : r.online ? '<span class="pill ok">Online</span>' : '<span class="pill">Offline</span>';
  route(/^\/admin\/linkbio$/, A.adm({
    title: 'Link Bio',
    render() {
      const d = use('bio.adm', { ttl: 20000 });
      const head = A.head('Katalog', 'Produk Link Bio', 'Jual template Link Bio. Pembeli mengedit halaman sendiri: profil, warna, media sosial, dan maksimal ' + MAX + ' tautan. Dibuka lewat domain/#namamember.', '<button class="btn pri" data-act="bioa-new">' + ic('plus', 'sm') + 'Tambah Produk Link Bio</button>');
      if (!d) return head + A.skelBox(220);
      const prod = d.produk.length ? '<div class="col" style="gap:8px">' + d.produk.map(p => '<div class="row card flat" style="padding:10px 14px;gap:12px"><div class="grow"><b>' + esc(p.judul) + '</b><div class="small muted">' + N.rp(p.harga) + ' · ' + (p.aktif ? 'tampil di katalog' : 'disembunyikan dari katalog') + '</div></div><a class="btn ghost xs" href="#/admin/produk/digital">' + ic('edit', 'sm') + 'Ubah</a>' + A.switchH(p.aktif, 'data-change="bioa-prod" data-id="' + esc(p.id) + '" aria-label="Aktifkan produk"') + '</div>').join('') + '</div>' : '<div class="alert info">' + ic('info') + '<span>Belum ada produk Link Bio. Klik “Tambah Produk Link Bio” — atau pada Produk Digital pilih cara tampil “Link Bio”.</span></div>';
      const rows = d.rows.length ? '<div class="tw"><table class="t"><thead><tr><th>Halaman</th><th>Pemilik</th><th>Tautan</th><th>Status</th><th></th></tr></thead><tbody>' + d.rows.map(r => '<tr><td><a class="mono bold" href="#' + esc(r.slug) + '" target="_blank" rel="noopener">#' + esc(r.slug) + '</a><div class="small muted">' + esc(r.nama) + '</div></td><td>' + esc(r.pemilik) + '<div class="small muted">' + esc(r.email) + '</div></td><td>' + r.jumlah_link + '/' + d.maks_link + '</td><td>' + pillS(r) + '</td><td class="right"><button class="btn ' + (r.blokir ? 'soft' : 'danger') + ' xs" data-act="bioa-blok" data-id="' + esc(r.id) + '" data-b="' + (r.blokir ? '0' : '1') + '">' + (r.blokir ? 'Buka blokir' : 'Blokir') + '</button> <button class="btn ghost xs" data-act="bioa-del" data-id="' + esc(r.id) + '" aria-label="Hapus">' + ic('x', 'sm') + '</button></td></tr>').join('') + '</tbody></table></div>' : A.empty('link', 'Belum ada member yang membuat halaman Link Bio.');
      return head + '<div class="card ' + (d.aktif_global ? '' : 'warnb') + '"><div class="row" style="gap:14px;align-items:center">' + A.switchH(d.aktif_global, 'data-change="bioa-global" aria-label="Saklar Link Bio"') + '<div class="grow"><b>Fitur Link Bio ' + (d.aktif_global ? 'AKTIF' : 'NONAKTIF') + '</b><div class="small muted">Saklar utama: bila dimatikan, semua halaman Link Bio langsung tidak bisa dibuka publik (data tetap aman).</div></div></div></div>' +
        '<div class="card mt" style="margin-top:16px"><h3>Produk Link Bio</h3><p class="small muted" style="margin:4px 0 12px">Nyalakan/matikan penjualan produk di katalog. Pembeli lama tetap bisa memakai halamannya.</p>' + prod + '</div>' +
        '<div class="card mt" style="margin-top:16px"><h3>Halaman member (' + d.rows.length + ')</h3><div style="margin-top:10px">' + rows + '</div></div>';
    }
  }));
  const reload = () => N.revalidate('u', 'bio.adm', {});
  ACT['bioa-new'] = () => A.openForm('Products', '', { tipe: 'digital', tipe_file: 'linkbio', judul: 'Template Link Bio Kustom', label: 'Link Bio Editable', harga: 39000, deskripsi: 'Satu halaman link untuk bio Instagram/TikTok: profil, warna sesuka Anda, media sosial, dan hingga ' + MAX + ' produk/tautan.' }, () => { reload(); A.refreshPublic(); N.revalidate('u', 'c:Products', {}); });
  INPUT['bioa-global'] = async el => {
    const on = el.checked; const r = await N.optimistic('u', 'bio.adm', d => { d.aktif_global = on; }, () => api('bio.admin', { aksi: 'global', aktif: on }));
    if (r.success) { N.sset('u', 'bio.adm', r.data); N.emit('ubio.adm'); toast('Link Bio ' + (on ? 'diaktifkan' : 'dinonaktifkan'), 'ok'); }
  };
  INPUT['bioa-prod'] = async el => {
    const id = el.getAttribute('data-id'), on = el.checked;
    const r = await N.optimistic('u', 'bio.adm', d => { const p = d.produk.find(x => x.id === id); if (p) p.aktif = on; }, () => api('content.save', { sheet: 'Products', row: { id: id, aktif: on ? 'YA' : 'TIDAK' } }));
    if (r.success) { A.refreshPublic(); N.revalidate('u', 'c:Products', {}); toast(on ? 'Produk tampil di katalog' : 'Produk disembunyikan dari katalog', 'ok'); }
  };
  ACT['bioa-blok'] = async el => {
    const id = el.getAttribute('data-id'), b = el.getAttribute('data-b') === '1';
    await N.optimistic('u', 'bio.adm', d => { const r = d.rows.find(x => x.id === id); if (r) r.blokir = b; }, () => api('bio.admin', { aksi: 'blokir', id: id, blokir: b }), r => { N.sset('u', 'bio.adm', r.data); toast(b ? 'Halaman diblokir' : 'Blokir dibuka', 'ok'); });
  };
  ACT['bioa-del'] = async el => {
    const id = el.getAttribute('data-id'); if (!await N.confirmBox('Hapus halaman Link Bio ini beserta fotonya? Tidak bisa dibatalkan.', { danger: true, ok: 'Hapus' })) return;
    await N.optimistic('u', 'bio.adm', d => { d.rows = d.rows.filter(x => x.id !== id); }, () => api('bio.admin', { aksi: 'hapus', id: id }), r => { N.sset('u', 'bio.adm', r.data); toast('Halaman dihapus', 'ok'); });
  };
  w.NKB = { bioPage, waText, orderHref };
})(window);
